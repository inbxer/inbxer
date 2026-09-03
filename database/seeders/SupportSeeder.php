<?php

namespace Database\Seeders;

use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Models\Channel;
use App\Domain\Label\Models\Label;
use App\Domain\Team\Models\Team;
use App\Domain\Tier\Models\Tier;
use Illuminate\Database\Seeder;

class SupportSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $teams = Team::all();

        foreach ($teams as $team) {
            // Seed default Labels if none exist
            if (Label::where('team_id', $team->id)->count() === 0) {
                Label::create(['team_id' => $team->id, 'name' => 'Question', 'color' => '#60a5fa', 'icon' => 'help-circle']);
                Label::create(['team_id' => $team->id, 'name' => 'Feedback', 'color' => '#a855f7', 'icon' => 'message-circle']);
                Label::create(['team_id' => $team->id, 'name' => 'Account', 'color' => '#34d399', 'icon' => 'code-2']);
                Label::create(['team_id' => $team->id, 'name' => 'Billing', 'color' => '#f59e0b', 'icon' => 'credit-card']);
                Label::create(['team_id' => $team->id, 'name' => 'Bug', 'color' => '#f43f5e', 'icon' => 'bug']);
                Label::create(['team_id' => $team->id, 'name' => 'sdf', 'color' => '#6b7280', 'icon' => 'tag']);
            }

            // Seed default Tiers if none exist
            if (Tier::where('team_id', $team->id)->count() === 0) {
                Tier::create(['team_id' => $team->id, 'name' => 'Free Tier', 'color' => '#a855f7']);
                Tier::create(['team_id' => $team->id, 'name' => 'Paid Tier', 'color' => '#f59e0b']);
            }

            // Seed default Channels if none exist
            if (Channel::where('team_id', $team->id)->count() === 0) {
                Channel::create(['team_id' => $team->id, 'name' => 'Chat', 'type' => ChannelType::Chat]);
                Channel::create(['team_id' => $team->id, 'name' => 'API', 'type' => ChannelType::Api]);
            }
        }
    }
}
