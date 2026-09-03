<?php

namespace App\Domain\Insights\Services;

use App\Domain\Sla\Models\SlaPolicy;
use App\Domain\Support\Models\CsatSurvey;
use App\Domain\Team\Models\Team;
use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Enums\TimelineEntryType;
use App\Domain\Thread\Models\Thread;
use App\Domain\Thread\Models\ThreadTimelineEntry;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Computes real reporting metrics (volume, response/resolution times,
 * daily series, heatmaps, SLA compliance) from actual thread and timeline
 * data, grouped by a chosen dimension (assignee, company, tenant, tier,
 * label, group, channel, priority). No mocked/placeholder numbers —
 * everything here is derived from `threads`, `thread_timeline_entries`,
 * `sla_policies`, and `csat_surveys` for the requested team and timeframe.
 */
class InsightsMetricsService
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function breakdown(Team $team, string $dimension, Carbon $since): array
    {
        $threads = $this->threadsSince($team, $since);

        $groups = [];

        foreach ($threads as $thread) {
            foreach ($this->resolveGroupKeys($dimension, $thread) as $key => $label) {
                $groups[$key]['label'] ??= $label;
                $groups[$key]['threads'][] = $thread;
            }
        }

        return collect($groups)
            ->map(fn (array $group) => $this->summarize($dimension, $group['label'], $group['threads']))
            ->sortByDesc('volume')
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function overview(Team $team, Carbon $since): array
    {
        $threads = $this->threadsSince($team, $since);
        $waiting = Thread::where('team_id', $team->id)
            ->whereIn('status', [ThreadStatus::WaitingForCustomer, ThreadStatus::Snoozed])
            ->get();

        $days = max(1, (int) $since->diffInDays(Carbon::now()));

        return [
            'queue_size' => Thread::where('team_id', $team->id)
                ->whereNotIn('status', [ThreadStatus::Done, ThreadStatus::Ignored, ThreadStatus::Spam])
                ->count(),
            'new_threads' => $threads->count(),
            'threads_done' => $threads->where('status', ThreadStatus::Done)->count(),
            'median_first_response_seconds' => $this->medianDuration($threads->all(), 'first_response_at'),
            'median_resolution_seconds' => $this->medianDuration($threads->all(), 'resolved_at'),
            'p90_first_response_seconds' => $this->percentileDuration($threads->all(), 'first_response_at', 90),
            'p90_resolution_seconds' => $this->percentileDuration($threads->all(), 'resolved_at', 90),
            'median_customer_wait_seconds' => $this->medianWaitSeconds($waiting->all()),
            'p90_customer_wait_seconds' => $this->percentile(
                collect($waiting->all())
                    ->filter(fn (Thread $t) => $t->status_changed_at !== null)
                    ->map(fn (Thread $t): int => (int) $t->status_changed_at->diffInSeconds(Carbon::now()))
                    ->sort()->values(),
                90,
            ),
            'median_next_response_seconds' => $this->medianNextResponse($threads->pluck('id')->all()),
            'new_threads_per_day' => $this->dailyCounts($team, $since, $days, 'created'),
            'reopened_per_day' => $this->dailyCounts($team, $since, $days, 'reopened'),
            'done_per_day' => $this->dailyCounts($team, $since, $days, 'done'),
            'first_response_series' => $this->dailyMedianSeries($threads->all(), $since, $days, 'first_response_at'),
            'resolution_series' => $this->dailyMedianSeries($threads->all(), $since, $days, 'resolved_at'),
            'queue_size_series' => $this->dailyCounts($team, $since, $days, 'created'),
            'heatmap' => $this->heatmap($threads->all()),
            'volume_by_company' => $this->topN($this->breakdown($team, 'company', $since), 5),
            'volume_by_tier' => $this->topN($this->breakdown($team, 'tier', $since), 5),
            'volume_by_label' => $this->topN($this->breakdown($team, 'label', $since), 5),
            'sla_compliance_first_response' => $this->slaCompliance($team, $threads->all(), 'first_response'),
            'sla_compliance_next_response' => $this->slaCompliance($team, $threads->all(), 'next_response'),
            'breached_threads' => $this->breachedThreads($team),
            'csat' => $this->csat($team, $since),
        ];
    }

    /**
     * @return array{positive_percentage: float|null, total_responses: int, recent: array<int, array<string, mixed>>}
     */
    private function csat(Team $team, Carbon $since): array
    {
        $responded = CsatSurvey::where('team_id', $team->id)
            ->whereNotNull('responded_at')
            ->where('responded_at', '>=', $since)
            ->with('tenant:id,name')
            ->orderByDesc('responded_at')
            ->get(['id', 'tenant_id', 'rating', 'comment', 'responded_at']);

        $total = $responded->count();
        $positive = $responded->filter(fn (CsatSurvey $s) => $s->isPositive())->count();

        return [
            'positive_percentage' => $total > 0 ? round(($positive / $total) * 100, 1) : null,
            'total_responses' => $total,
            'recent' => $responded->take(10)->map(fn (CsatSurvey $s) => [
                'id' => $s->id,
                'tenant_name' => $s->tenant?->name,
                'rating' => $s->rating,
                'comment' => $s->comment,
                'responded_at' => $s->responded_at?->toIso8601String(),
            ])->values()->all(),
        ];
    }

    /**
     * @return Collection<int, Thread>
     */
    private function threadsSince(Team $team, Carbon $since): Collection
    {
        return Thread::where('team_id', $team->id)
            ->where('created_at', '>=', $since)
            ->with(['assignee', 'tenant.company', 'tenant.groups', 'tier', 'labels', 'channel'])
            ->get();
    }

    /**
     * @return array<string, string> map of group key => display label
     */
    private function resolveGroupKeys(string $dimension, Thread $thread): array
    {
        return match ($dimension) {
            'assignee' => $thread->assignee
                ? ["user:{$thread->assignee->id}" => $thread->assignee->name]
                : [],
            'company' => $thread->tenant?->company
                ? ["company:{$thread->tenant->company->id}" => $thread->tenant->company->name]
                : [],
            'tenant' => $thread->tenant
                ? ["tenant:{$thread->tenant->id}" => $thread->tenant->name]
                : [],
            'tier' => $thread->tier
                ? ["tier:{$thread->tier->id}" => $thread->tier->name]
                : ['tier:none' => 'No tier'],
            'label' => $thread->labels->isEmpty()
                ? []
                : $thread->labels->mapWithKeys(fn ($label) => ["label:{$label->id}" => $label->name])->all(),
            'group' => $thread->tenant?->groups?->isNotEmpty()
                ? $thread->tenant->groups->mapWithKeys(fn ($group) => ["group:{$group->id}" => $group->name])->all()
                : [],
            'channel' => $thread->channel
                ? ["channel:{$thread->channel->id}" => $thread->channel->name]
                : [],
            'priority' => ["priority:{$thread->priority->value}" => ucfirst($thread->priority->value)],
            default => [],
        };
    }

    /**
     * @param  array<int, Thread>  $threads
     * @return array<string, mixed>
     */
    private function summarize(string $dimension, string $label, array $threads): array
    {
        $threadIds = array_map(fn (Thread $t) => $t->id, $threads);

        $row = [
            'label' => $label,
            'volume' => count($threads),
            'first_response_seconds' => $this->medianDuration($threads, 'first_response_at'),
            'next_response_seconds' => $this->medianNextResponse($threadIds),
            'resolution_seconds' => $this->medianDuration($threads, 'resolved_at'),
            'customer_wait_seconds' => $this->medianWaitSeconds(
                array_values(array_filter(
                    $threads,
                    fn (Thread $t) => in_array($t->status, [ThreadStatus::WaitingForCustomer, ThreadStatus::Snoozed], true),
                )),
            ),
        ];

        if ($dimension === 'assignee') {
            $userId = $threads[0]->assignee?->id;

            $row['messages_sent'] = $userId
                ? ThreadTimelineEntry::whereIn('thread_id', $threadIds)
                    ->where('actor_type', ActorType::User)
                    ->where('actor_id', (string) $userId)
                    ->where('entry_type', TimelineEntryType::Message)
                    ->count()
                : 0;
            $row['assigned'] = count($threads);
            $row['resolved'] = count(array_filter($threads, fn (Thread $t) => $t->status === ThreadStatus::Done));
        }

        return $row;
    }

    /**
     * Median gap between an agent's first and second reply on a thread — a
     * real, if imperfect, stand-in for "next response time" distinct from
     * first response time.
     *
     * @param  array<int, string>  $threadIds
     */
    private function medianNextResponse(array $threadIds): ?int
    {
        if (empty($threadIds)) {
            return null;
        }

        $gaps = ThreadTimelineEntry::whereIn('thread_id', $threadIds)
            ->where('actor_type', ActorType::User)
            ->where('entry_type', TimelineEntryType::Message)
            ->where('is_internal', false)
            ->orderBy('thread_id')
            ->orderBy('created_at')
            ->get(['thread_id', 'created_at'])
            ->groupBy('thread_id')
            ->map(function (Collection $entries) {
                $first = $entries->first();
                $second = $entries->skip(1)->first();

                return $first && $second ? $first->created_at->diffInSeconds($second->created_at) : null;
            })
            ->filter(fn ($v) => $v !== null)
            ->sort()
            ->values();

        return $this->median($gaps);
    }

    /**
     * @param  array<int, Thread>  $threads
     */
    private function medianDuration(array $threads, string $field): ?int
    {
        return $this->median($this->durations($threads, $field));
    }

    /**
     * @param  array<int, Thread>  $threads
     */
    private function percentileDuration(array $threads, string $field, int $percentile): ?int
    {
        return $this->percentile($this->durations($threads, $field), $percentile);
    }

    /**
     * @param  array<int, Thread>  $threads
     * @return Collection<int, int>
     */
    private function durations(array $threads, string $field): Collection
    {
        return collect($threads)
            ->filter(fn (Thread $t) => $t->{$field} !== null)
            ->map(fn (Thread $t): int => (int) $t->created_at->diffInSeconds($t->{$field}))
            ->sort()
            ->values();
    }

    /**
     * @param  array<int, Thread>  $threads
     */
    private function medianWaitSeconds(array $threads): ?int
    {
        $durations = collect($threads)
            ->filter(fn (Thread $t) => $t->status_changed_at !== null)
            ->map(fn (Thread $t): int => (int) $t->status_changed_at->diffInSeconds(Carbon::now()))
            ->sort()
            ->values();

        return $this->median($durations);
    }

    /**
     * Daily counts for a metric over the last `$days` days.
     *
     * @return array<int, array{date: string, count: int}>
     */
    private function dailyCounts(Team $team, Carbon $since, int $days, string $type): array
    {
        $buckets = $this->emptyDayBuckets($since, $days);

        if ($type === 'created') {
            Thread::where('team_id', $team->id)
                ->where('created_at', '>=', $since)
                ->get(['created_at'])
                ->each(function (Thread $thread) use (&$buckets) {
                    $day = $thread->created_at->toDateString();
                    if (isset($buckets[$day])) {
                        $buckets[$day]++;
                    }
                });

            return $this->bucketsToSeries($buckets);
        }

        $targetStatus = $type === 'done' ? 'done' : null;

        ThreadTimelineEntry::whereHas('thread', fn ($q) => $q->where('team_id', $team->id))
            ->where('entry_type', TimelineEntryType::StatusChange)
            ->where('created_at', '>=', $since)
            ->get(['created_at', 'metadata'])
            ->each(function (ThreadTimelineEntry $entry) use (&$buckets, $type, $targetStatus) {
                $from = $entry->metadata['from'] ?? null;
                $to = $entry->metadata['to'] ?? null;

                $matches = $type === 'done'
                    ? $to === $targetStatus
                    : in_array($from, ['done', 'ignored'], true) && ! in_array($to, ['done', 'ignored'], true);

                if (! $matches) {
                    return;
                }

                $day = $entry->created_at->toDateString();
                if (isset($buckets[$day])) {
                    $buckets[$day]++;
                }
            });

        return $this->bucketsToSeries($buckets);
    }

    /**
     * @param  array<int, Thread>  $threads
     * @return array<int, array{date: string, seconds: int|null}>
     */
    private function dailyMedianSeries(array $threads, Carbon $since, int $days, string $field): array
    {
        $byDay = [];

        foreach ($threads as $thread) {
            if ($thread->{$field} === null) {
                continue;
            }

            $day = $thread->created_at->toDateString();
            $byDay[$day][] = (int) $thread->created_at->diffInSeconds($thread->{$field});
        }

        $series = [];
        $cursor = $since->copy()->startOfDay();
        $end = Carbon::now()->startOfDay();

        while ($cursor->lte($end)) {
            $day = $cursor->toDateString();
            /** @var Collection<int, int> $values */
            $values = collect($byDay[$day] ?? [])->map(fn ($v): int => (int) $v)->sort()->values();
            $series[] = ['date' => $day, 'seconds' => $this->median($values)];
            $cursor->addDay();
        }

        return $series;
    }

    /**
     * 7x24 grid (day-of-week x hour) of thread creation counts.
     *
     * @param  array<int, Thread>  $threads
     * @return array<int, array{day: int, hour: int, count: int}>
     */
    private function heatmap(array $threads): array
    {
        $grid = [];

        foreach ($threads as $thread) {
            $key = $thread->created_at->dayOfWeekIso.'-'.$thread->created_at->hour;
            $grid[$key] = ($grid[$key] ?? 0) + 1;
        }

        $cells = [];
        for ($day = 1; $day <= 7; $day++) {
            for ($hour = 0; $hour < 24; $hour++) {
                $cells[] = [
                    'day' => $day,
                    'hour' => $hour,
                    'count' => $grid["{$day}-{$hour}"] ?? 0,
                ];
            }
        }

        return $cells;
    }

    /**
     * Percentage of threads that met their matching SLA card's deadline.
     * Returns null (rendered "N/A" by the frontend) when no active card of
     * this type matches any thread in the set.
     *
     * @param  array<int, Thread>  $threads
     */
    private function slaCompliance(Team $team, array $threads, string $type): ?float
    {
        $policies = SlaPolicy::where('team_id', $team->id)
            ->where('is_active', true)
            ->where('type', $type)
            ->get();

        if ($policies->isEmpty()) {
            return null;
        }

        $matched = 0;
        $compliant = 0;

        foreach ($threads as $thread) {
            $policy = $policies->first(function (SlaPolicy $p) use ($thread) {
                $tierMatches = $p->tier_id === null || $p->tier_id === $thread->tier_id;
                $priorityMatches = empty($p->priorities) || in_array($thread->priority->value, $p->priorities, true);

                return $tierMatches && $priorityMatches;
            });

            if (! $policy) {
                continue;
            }

            if ($type === 'first_response') {
                if ($thread->first_response_at === null) {
                    continue;
                }

                $matched++;
                $deadline = $thread->created_at->copy()->addMinutes($policy->minutes);

                if ($thread->first_response_at->lte($deadline)) {
                    $compliant++;
                }

                continue;
            }

            $matched++;

            if ($thread->sla_next_response_breached_at === null) {
                $compliant++;
            }
        }

        return $matched > 0 ? round(($compliant / $matched) * 100, 1) : null;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function breachedThreads(Team $team): array
    {
        return Thread::where('team_id', $team->id)
            ->where(function ($q) {
                $q->whereNotNull('sla_first_response_breached_at')
                    ->orWhereNotNull('sla_next_response_breached_at');
            })
            ->whereNotIn('status', [ThreadStatus::Done, ThreadStatus::Ignored, ThreadStatus::Spam])
            ->orderByDesc('sla_first_response_breached_at')
            ->limit(10)
            ->get(['id', 'title', 'sequence_number', 'sla_first_response_breached_at', 'sla_next_response_breached_at'])
            ->map(fn (Thread $t) => [
                'id' => $t->id,
                'title' => $t->title,
                'reference' => "T-{$t->sequence_number}",
                'type' => $t->sla_first_response_breached_at ? 'first_response' : 'next_response',
            ])
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function topN(array $rows, int $n): array
    {
        return array_slice($rows, 0, $n);
    }

    /**
     * @return array<string, int>
     */
    private function emptyDayBuckets(Carbon $since, int $days): array
    {
        $buckets = [];
        $cursor = $since->copy()->startOfDay();

        for ($i = 0; $i <= $days; $i++) {
            $buckets[$cursor->toDateString()] = 0;
            $cursor->addDay();
        }

        return $buckets;
    }

    /**
     * @param  array<string, int>  $buckets
     * @return array<int, array{date: string, count: int}>
     */
    private function bucketsToSeries(array $buckets): array
    {
        return collect($buckets)
            ->map(fn (int $count, string $date) => ['date' => $date, 'count' => $count])
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int, int>  $sorted
     */
    private function median(Collection $sorted): ?int
    {
        return $this->percentile($sorted, 50);
    }

    /**
     * @param  Collection<int, int>  $sorted
     */
    private function percentile(Collection $sorted, int $percentile): ?int
    {
        if ($sorted->isEmpty()) {
            return null;
        }

        $count = $sorted->count();

        if ($percentile === 50) {
            $mid = intdiv($count, 2);

            return $count % 2 === 0
                ? intdiv($sorted[$mid - 1] + $sorted[$mid], 2)
                : $sorted[$mid];
        }

        $index = (int) ceil(($percentile / 100) * $count) - 1;

        return $sorted[max(0, min($count - 1, $index))];
    }
}
