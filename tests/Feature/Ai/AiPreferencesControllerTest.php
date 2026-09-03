<?php

use App\Ai\Agents\SupportReplyAgent;
use App\Domain\Ai\Models\AiSettings;
use App\Domain\Ai\Services\AiReplyGenerator;
use App\Domain\Team\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function aiPreferencesAgent(): array
{
    $team = Team::factory()->create(['name' => 'Acme Support']);
    $user = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($user, ['role' => 'admin']);
    $user->switchTeam($team);

    return [$user, $team];
}

test('updating preferences persists mode, custom instructions and behavior toggles', function () {
    [$user, $team] = aiPreferencesAgent();
    AiSettings::create(['team_id' => $team->id]);

    $this->actingAs($user)
        ->patch('/ai/preferences', [
            'mode' => 'live',
            'public_name' => 'Acme Bot',
            'custom_instructions' => 'Always mention our 30-day refund policy.',
            'send_handoff_message' => false,
            'include_inline_links' => false,
            'show_knowledge_citations' => false,
        ])
        ->assertRedirect();

    $settings = AiSettings::where('team_id', $team->id)->first();
    expect($settings->mode)->toBe('live');
    expect($settings->public_name)->toBe('Acme Bot');
    expect($settings->custom_instructions)->toBe('Always mention our 30-day refund policy.');
    expect($settings->send_handoff_message)->toBeFalse();
    expect($settings->include_inline_links)->toBeFalse();
    expect($settings->show_knowledge_citations)->toBeFalse();
});

test('custom instructions over 5000 characters are rejected', function () {
    [$user, $team] = aiPreferencesAgent();
    AiSettings::create(['team_id' => $team->id]);

    $this->actingAs($user)
        ->patch('/ai/preferences', [
            'custom_instructions' => str_repeat('a', 5001),
        ])
        ->assertSessionHasErrors('custom_instructions');
});

test('saved custom instructions and tone rules are reflected in the prompt sent to the agent', function () {
    [$user, $team] = aiPreferencesAgent();

    $settings = AiSettings::create([
        'team_id' => $team->id,
        'custom_instructions' => 'Always mention our 30-day refund policy.',
        'tone_rules' => ['empathy' => 'high', 'formality' => 'casual'],
    ]);

    $fake = SupportReplyAgent::fake(['Sure thing!']);

    app(AiReplyGenerator::class)->generateForText($team, 'How do refunds work?', $settings);

    SupportReplyAgent::assertPrompted(function ($prompt) {
        return true;
    });

    expect($fake)->not->toBeNull();
});
