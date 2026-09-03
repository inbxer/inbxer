<?php

use App\Ai\Agents\SupportReplyAgent;
use App\Domain\Ai\Models\AiSettings;
use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Models\Channel;
use App\Domain\HelpCenter\Enums\KnowledgeSourceKind;
use App\Domain\HelpCenter\Models\KnowledgeArticle;
use App\Domain\HelpCenter\Models\KnowledgeSource;
use App\Domain\HelpCenter\Models\MintlifyArticle;
use App\Domain\HelpCenter\Models\MintlifyConnection;
use App\Domain\Team\Models\Team;
use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Enums\TimelineEntryType;
use App\Domain\Thread\Models\Thread;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function aiSuggestionAgent(): array
{
    $team = Team::factory()->create();
    $user = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($user, ['role' => 'admin']);
    $user->switchTeam($team);

    return [$user, $team];
}

function aiSuggestionThread(Team $team): Thread
{
    $channel = Channel::create(['team_id' => $team->id, 'type' => ChannelType::Email, 'name' => 'Email', 'is_active' => true, 'settings' => []]);
    $tenant = Tenant::create(['team_id' => $team->id, 'name' => 'Cust', 'email' => 'cust@example.com']);

    return Thread::create([
        'team_id' => $team->id,
        'channel_id' => $channel->id,
        'tenant_id' => $tenant->id,
        'title' => 'Help with my order',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);
}

test('returns 403 when suggested responses are not enabled', function () {
    [$user, $team] = aiSuggestionAgent();
    $thread = aiSuggestionThread($team);
    AiSettings::create(['team_id' => $team->id, 'mode' => 'shadow', 'suggested_responses_enabled' => false]);

    $this->actingAs($user)
        ->getJson("/threads/{$thread->id}/ai-suggestion")
        ->assertStatus(403)
        ->assertJson(['error' => 'Suggested responses are not enabled.']);
});

test('returns a generated reply when suggested responses are enabled', function () {
    SupportReplyAgent::fake(['Here is a helpful reply.']);

    [$user, $team] = aiSuggestionAgent();
    $thread = aiSuggestionThread($team);
    AiSettings::create(['team_id' => $team->id, 'mode' => 'shadow', 'suggested_responses_enabled' => true]);

    $this->actingAs($user)
        ->getJson("/threads/{$thread->id}/ai-suggestion")
        ->assertOk()
        ->assertJson(['reply' => 'Here is a helpful reply.'])
        ->assertJsonStructure(['reply', 'articles']);
});

test('suggested article list merges Mintlify and generic knowledge articles', function () {
    SupportReplyAgent::fake(['Here is a helpful reply.']);

    [$user, $team] = aiSuggestionAgent();
    $thread = aiSuggestionThread($team);
    $thread->timelineEntries()->create([
        'actor_type' => ActorType::Tenant,
        'entry_type' => TimelineEntryType::Message,
        'body' => 'I have a question about my invoice and billing cycle.',
    ]);
    AiSettings::updateOrCreate(['team_id' => $team->id], ['mode' => 'shadow', 'suggested_responses_enabled' => true]);

    $connection = MintlifyConnection::create(['team_id' => $team->id, 'site_url' => 'https://docs.example.com', 'is_active' => true]);
    MintlifyArticle::create([
        'team_id' => $team->id,
        'mintlify_connection_id' => $connection->id,
        'title' => 'Billing FAQ',
        'url' => 'https://docs.example.com/billing-faq',
        'content_excerpt' => 'Answers to common billing and invoicing questions.',
    ]);

    $source = KnowledgeSource::create(['team_id' => $team->id, 'kind' => KnowledgeSourceKind::Url, 'source_url' => 'https://example.com/billing', 'is_active' => true]);
    KnowledgeArticle::create([
        'team_id' => $team->id,
        'knowledge_source_id' => $source->id,
        'title' => 'Understanding your invoice',
        'url' => 'https://example.com/billing',
        'content_excerpt' => 'How to read your monthly invoice and billing cycle.',
    ]);

    $response = $this->actingAs($user)
        ->getJson("/threads/{$thread->id}/ai-suggestion")
        ->assertOk();

    $urls = collect($response->json('articles'))->pluck('url');
    expect($urls)->toContain('https://docs.example.com/billing-faq');
    expect($urls)->toContain('https://example.com/billing');
});

test('cannot fetch a suggestion for a thread belonging to another team', function () {
    [$user, $team] = aiSuggestionAgent();
    AiSettings::create(['team_id' => $team->id, 'mode' => 'shadow', 'suggested_responses_enabled' => true]);

    $otherTeam = Team::factory()->create();
    $otherThread = aiSuggestionThread($otherTeam);

    $this->actingAs($user)
        ->getJson("/threads/{$otherThread->id}/ai-suggestion")
        ->assertStatus(403);
});
