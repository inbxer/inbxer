<?php

use App\Ai\Agents\ToneRulesAgent;
use App\Domain\Ai\Models\AiSettings;
use App\Domain\Team\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function aiToneGenerateAgent(): array
{
    $team = Team::factory()->create(['name' => 'Acme Support']);
    $user = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($user, ['role' => 'admin']);
    $user->switchTeam($team);

    return [$user, $team];
}

test('generating tone rules returns all five fields', function () {
    [$user, $team] = aiToneGenerateAgent();
    AiSettings::create(['team_id' => $team->id]);

    ToneRulesAgent::fake([[
        'empathy' => 'Acknowledge frustration before offering solutions.',
        'language' => 'Use plain, everyday language.',
        'formality' => 'Friendly but professional.',
        'personality' => 'Helpful, upbeat, and concise.',
        'warmth' => 'Warm and welcoming.',
    ]]);

    $this->actingAs($user)
        ->postJson('/ai/configuration/tone/generate')
        ->assertOk()
        ->assertJsonStructure([
            'tone_rules' => ['empathy', 'language', 'formality', 'personality', 'warmth'],
        ])
        ->assertJson([
            'tone_rules' => [
                'empathy' => 'Acknowledge frustration before offering solutions.',
                'language' => 'Use plain, everyday language.',
                'formality' => 'Friendly but professional.',
                'personality' => 'Helpful, upbeat, and concise.',
                'warmth' => 'Warm and welcoming.',
            ],
        ]);
});

test('a failure generating tone rules returns a graceful error response', function () {
    [$user, $team] = aiToneGenerateAgent();
    AiSettings::create(['team_id' => $team->id]);

    ToneRulesAgent::fake(function () {
        throw new RuntimeException('provider unavailable');
    });

    $this->actingAs($user)
        ->postJson('/ai/configuration/tone/generate')
        ->assertStatus(502)
        ->assertJsonStructure(['error']);
});
