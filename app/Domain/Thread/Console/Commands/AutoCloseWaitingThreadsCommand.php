<?php

namespace App\Domain\Thread\Console\Commands;

use App\Domain\Team\Models\Team;
use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Enums\TimelineEntryType;
use App\Domain\Thread\Models\Thread;
use Illuminate\Console\Command;

class AutoCloseWaitingThreadsCommand extends Command
{
    /**
     * Maps the "move_waiting_to_done_after" setting value to a duration in hours.
     */
    private const DURATIONS = [
        '1h' => 1,
        '4h' => 4,
        '24h' => 24,
        '3d' => 72,
    ];

    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'inbxer:auto-close-waiting-threads';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Move threads waiting for customer response to Done after each team\'s configured duration.';

    /**
     * Execute the console command.
     */
    public function handle(): void
    {
        Team::query()
            ->whereNotNull('settings')
            ->whereJsonContainsKey('settings->workflow->status->move_waiting_to_done_after')
            ->each(function (Team $team) {
                $this->processTeam($team);
            });
    }

    /**
     * Auto-close eligible waiting threads for a single team.
     */
    protected function processTeam(Team $team): void
    {
        $setting = $team->settings['workflow']['status']['move_waiting_to_done_after'] ?? 'never';
        $hours = self::DURATIONS[$setting] ?? null;

        if ($hours === null) {
            return;
        }

        $threads = Thread::where('team_id', $team->id)
            ->where('status', ThreadStatus::WaitingForCustomer)
            ->where('status_changed_at', '<=', now()->subHours($hours))
            ->get();

        foreach ($threads as $thread) {
            $thread->update(['status' => ThreadStatus::Done]);

            $thread->timelineEntries()->create([
                'actor_type' => ActorType::System,
                'entry_type' => TimelineEntryType::StatusChange,
                'metadata' => [
                    'from' => ThreadStatus::WaitingForCustomer->value,
                    'to' => ThreadStatus::Done->value,
                    'reason' => 'auto_close_waiting',
                ],
                'body' => 'Automatically moved to Done after waiting for customer response.',
            ]);

            $this->info("Thread [{$thread->id}] auto-closed for team [{$team->id}].");
        }
    }
}
