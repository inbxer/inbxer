<?php

namespace App\Domain\Team\Console\Commands;

use App\Domain\Sla\Models\BusinessHours;
use App\Domain\Team\Models\Team;
use App\Domain\Team\Services\AwayModeService;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * For teams configured to auto-away agents outside business hours,
 * marks members away when outside hours and clears auto-away when back in hours.
 */
class SyncAwayModeFromBusinessHoursCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'inbxer:sync-away-mode';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = "Sync agents' away status with their team's business hours.";

    public function handle(AwayModeService $awayMode): void
    {
        Team::query()
            ->whereNotNull('settings')
            ->whereJsonContainsKey('settings->workflow->away_mode->outside_hours_mode')
            ->each(function (Team $team) use ($awayMode) {
                $this->processTeam($team, $awayMode);
            });
    }

    private function processTeam(Team $team, AwayModeService $awayMode): void
    {
        $mode = $team->settings['workflow']['away_mode']['outside_hours_mode'] ?? 'offline_mode';

        if ($mode !== 'away_mode') {
            return;
        }

        $businessHours = BusinessHours::where('team_id', $team->id)
            ->where('is_default', true)
            ->first();

        if (! $businessHours) {
            return;
        }

        $withinHours = $businessHours->isWithinHours(Carbon::now());

        $team->members->each(function (User $user) use ($withinHours, $team, $awayMode) {
            if (! $withinHours && ! $user->is_away) {
                $awayMode->markAway($user, $team, auto: true);
                $this->info("Marked user [{$user->id}] away for team [{$team->id}] (outside business hours).");
            } elseif ($withinHours && $user->is_away && $user->is_away_auto) {
                $awayMode->markAvailable($user);
                $this->info("Marked user [{$user->id}] available for team [{$team->id}] (back in business hours).");
            }
        });
    }
}
