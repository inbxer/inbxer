<?php

namespace App\Domain\Sla\Console\Commands;

use App\Domain\Sla\Models\BusinessHours;
use App\Domain\Sla\Models\SlaPolicy;
use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Enums\TimelineEntryType;
use App\Domain\Thread\Models\Thread;
use App\Domain\Workflow\Enums\WorkflowTriggerType;
use App\Domain\Workflow\Services\WorkflowTriggerDispatcher;
use Carbon\CarbonInterface;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Detects threads that are approaching or have breached a tier's "first
 * response" or "next response" SLA card (configured on the Tiers & SLAs
 * settings page).
 *
 * - A breach is always recorded (for SLA compliance reporting) and fires the
 *   "SLA breached" workflow trigger only when the card's "notify on breach"
 *   toggle is enabled.
 * - "Approaching breach" fires the "SLA approaching breach" workflow trigger
 *   once, `notify_before_minutes` before the deadline, when the card has
 *   that field set. Both triggers are plain Workflow Engine triggers, so any
 *   escalation action (reassign, change priority, Slack notification, HTTP
 *   webhook, add note) can be attached to them from the Workflow builder.
 *
 * Deadlines are measured in calendar time from thread creation, not
 * business-hours adjusted, except that a card marked "only business hours"
 * is skipped entirely while the team is currently outside business hours.
 * "Next response" deadlines are measured from when the thread most recently
 * entered `needs_next_response` (i.e. the customer is waiting on a reply).
 */
class CheckSlaBreachesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'inbxer:check-sla-breaches';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Detect threads that breached a tier SLA card and fire the SLA breach trigger.';

    public function handle(WorkflowTriggerDispatcher $dispatcher): void
    {
        SlaPolicy::where('is_active', true)->each(function (SlaPolicy $policy) use ($dispatcher) {
            if ($policy->only_business_hours && ! $this->isWithinBusinessHours($policy)) {
                return;
            }

            $policy->type === 'next_response'
                ? $this->checkNextResponse($policy, $dispatcher)
                : $this->checkFirstResponse($policy, $dispatcher);
        });
    }

    private function checkFirstResponse(SlaPolicy $policy, WorkflowTriggerDispatcher $dispatcher): void
    {
        $this->matchingThreads($policy)
            ->whereNull('first_response_at')
            ->whereNull('sla_first_response_breached_at')
            ->get()
            ->each(function (Thread $thread) use ($policy, $dispatcher) {
                $deadline = $thread->created_at->addMinutes($policy->minutes);

                if ($deadline->isFuture()) {
                    $this->maybeNotifyApproaching($thread, $policy, $deadline, 'first_response', $dispatcher);

                    return;
                }

                $thread->update(['sla_first_response_breached_at' => now()]);
                $this->logBreach($thread, $policy, 'first_response');

                if ($policy->notify_on_breach) {
                    $dispatcher->dispatch($thread, WorkflowTriggerType::SlaBr);
                }

                $this->info("Thread [{$thread->id}] breached first-response SLA ({$policy->minutes}m).");
            });
    }

    private function checkNextResponse(SlaPolicy $policy, WorkflowTriggerDispatcher $dispatcher): void
    {
        $this->matchingThreads($policy)
            ->where('status', ThreadStatus::NeedsNextResponse)
            ->whereNull('sla_next_response_breached_at')
            ->get()
            ->each(function (Thread $thread) use ($policy, $dispatcher) {
                if ($thread->status_changed_at === null) {
                    return;
                }

                $deadline = $thread->status_changed_at->addMinutes($policy->minutes);

                if ($deadline->isFuture()) {
                    $this->maybeNotifyApproaching($thread, $policy, $deadline, 'next_response', $dispatcher);

                    return;
                }

                $thread->update(['sla_next_response_breached_at' => now()]);
                $this->logBreach($thread, $policy, 'next_response');

                if ($policy->notify_on_breach) {
                    $dispatcher->dispatch($thread, WorkflowTriggerType::SlaBr);
                }

                $this->info("Thread [{$thread->id}] breached next-response SLA ({$policy->minutes}m).");
            });
    }

    /**
     * Fires the "SLA approaching breach" workflow trigger once per thread,
     * `notify_before_minutes` before the deadline, when the card has that
     * field configured.
     */
    private function maybeNotifyApproaching(Thread $thread, SlaPolicy $policy, CarbonInterface $deadline, string $type, WorkflowTriggerDispatcher $dispatcher): void
    {
        if (! $policy->notify_before_minutes) {
            return;
        }

        $notifiedColumn = $type === 'first_response' ? 'sla_first_response_notified_at' : 'sla_next_response_notified_at';

        if ($thread->{$notifiedColumn} !== null) {
            return;
        }

        if ($deadline->clone()->subMinutes($policy->notify_before_minutes)->isFuture()) {
            return;
        }

        $thread->update([$notifiedColumn => now()]);
        $this->logApproaching($thread, $policy, $type);
        $dispatcher->dispatch($thread, WorkflowTriggerType::SlaApproachingBreach);
        $this->info("Thread [{$thread->id}] is approaching its {$type} SLA ({$policy->minutes}m).");
    }

    /**
     * @return Builder<Thread>
     */
    private function matchingThreads(SlaPolicy $policy): Builder
    {
        $labelIds = $policy->labelIds();

        return Thread::where('team_id', $policy->team_id)
            ->whereNotIn('status', [ThreadStatus::Done, ThreadStatus::Ignored, ThreadStatus::Spam])
            ->when($policy->tier_id, fn ($q) => $q->where('tier_id', $policy->tier_id))
            ->when(
                ! empty($policy->priorities),
                fn ($q) => $q->whereIn('priority', $policy->priorities),
            )
            ->when(! empty($labelIds) && $policy->require_all_labels, fn ($q) => $q->whereHas(
                'labels',
                fn ($labelQuery) => $labelQuery->whereIn('labels.id', $labelIds),
                '=',
                count($labelIds),
            ))
            ->when(! empty($labelIds) && ! $policy->require_all_labels, fn ($q) => $q->whereHas(
                'labels',
                fn ($labelQuery) => $labelQuery->whereIn('labels.id', $labelIds),
            ));
    }

    private function isWithinBusinessHours(SlaPolicy $policy): bool
    {
        $businessHours = BusinessHours::where('team_id', $policy->team_id)
            ->where('is_default', true)
            ->first();

        return $businessHours && $businessHours->isWithinHours(Carbon::now());
    }

    private function logBreach(Thread $thread, SlaPolicy $policy, string $type): void
    {
        $thread->timelineEntries()->create([
            'actor_type' => ActorType::System,
            'entry_type' => TimelineEntryType::SlaBreach,
            'metadata' => ['sla_policy_id' => $policy->id, 'type' => $type],
            'body' => $type === 'first_response'
                ? "SLA breached: first response was not sent within {$policy->minutes} minutes."
                : "SLA breached: no reply was sent to the customer's follow-up within {$policy->minutes} minutes.",
        ]);
    }

    private function logApproaching(Thread $thread, SlaPolicy $policy, string $type): void
    {
        $thread->timelineEntries()->create([
            'actor_type' => ActorType::System,
            'entry_type' => TimelineEntryType::Escalation,
            'metadata' => ['sla_policy_id' => $policy->id, 'type' => $type],
            'body' => $type === 'first_response'
                ? "Approaching SLA: first response is due within {$policy->notify_before_minutes} minutes."
                : "Approaching SLA: a reply to the customer's follow-up is due within {$policy->notify_before_minutes} minutes.",
        ]);
    }
}
