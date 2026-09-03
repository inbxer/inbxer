<?php

use App\Domain\HelpCenter\Jobs\SyncMintlifyDocsJob;
use App\Domain\HelpCenter\Models\MintlifyArticle;
use App\Domain\HelpCenter\Models\MintlifyConnection;
use App\Domain\HelpCenter\Services\MintlifyArticleSearchService;
use App\Domain\HelpCenter\Services\MintlifyClient;
use App\Domain\Team\Models\Team;
use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Enums\TimelineEntryType;
use App\Domain\Thread\Models\Thread;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

function mintlifyAgent(): array
{
    $team = Team::factory()->create();
    $user = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($user, ['role' => 'admin']);
    $user->switchTeam($team);

    return [$user, $team];
}

const FAKE_LLMS_TXT = <<<'TXT'
# Docs

- [Getting Started](https://docs.example.com/getting-started): How to install and configure the product for the first time.
- [Billing FAQ](https://docs.example.com/billing-faq): Answers to common billing and invoicing questions.
- [API Authentication](https://docs.example.com/api-auth): How to authenticate requests to the public API using tokens.
TXT;

test('an admin can connect a Mintlify Help Center and it queues an initial sync', function () {
    Queue::fake([SyncMintlifyDocsJob::class]);
    [$user, $team] = mintlifyAgent();
    Http::fake(['docs.example.com/llms.txt' => Http::response(FAKE_LLMS_TXT, 200)]);

    $this->actingAs($user)
        ->post('/settings/integrations/mintlify', [
            'site_url' => 'https://docs.example.com',
        ])
        ->assertRedirect();

    $connection = MintlifyConnection::where('team_id', $team->id)->firstOrFail();
    expect($connection->site_url)->toBe('https://docs.example.com');
    Queue::assertPushed(SyncMintlifyDocsJob::class, fn ($job) => $job->connectionId === $connection->id);
});

test('connecting a site that is unreachable fails validation instead of creating a connection', function () {
    [$user, $team] = mintlifyAgent();
    Http::fake(['unreachable.example.com/llms.txt' => Http::response('not found', 404)]);

    $this->actingAs($user)
        ->post('/settings/integrations/mintlify', [
            'site_url' => 'https://unreachable.example.com',
        ])
        ->assertSessionHasErrors('site_url');

    expect(MintlifyConnection::where('team_id', $team->id)->exists())->toBeFalse();
});

test('the sync job parses llms.txt and caches articles locally', function () {
    [, $team] = mintlifyAgent();
    Http::fake(['docs.example.com/llms.txt' => Http::response(FAKE_LLMS_TXT, 200)]);
    $connection = MintlifyConnection::create([
        'team_id' => $team->id,
        'site_url' => 'https://docs.example.com',
        'is_active' => true,
    ]);

    (new SyncMintlifyDocsJob($connection->id))->handle(app(MintlifyClient::class));

    expect(MintlifyArticle::where('team_id', $team->id)->count())->toBe(3);
    $article = MintlifyArticle::where('title', 'Billing FAQ')->firstOrFail();
    expect($article->url)->toBe('https://docs.example.com/billing-faq');
    expect($article->content_excerpt)->toContain('billing and invoicing');
    expect($connection->fresh()->last_synced_at)->not->toBeNull();
});

test('re-syncing removes articles that no longer exist on the docs site', function () {
    [, $team] = mintlifyAgent();
    $connection = MintlifyConnection::create([
        'team_id' => $team->id,
        'site_url' => 'https://docs.example.com',
        'is_active' => true,
    ]);
    MintlifyArticle::create([
        'team_id' => $team->id,
        'mintlify_connection_id' => $connection->id,
        'title' => 'Stale article',
        'url' => 'https://docs.example.com/stale',
    ]);

    Http::fake(['docs.example.com/llms.txt' => Http::response(FAKE_LLMS_TXT, 200)]);
    (new SyncMintlifyDocsJob($connection->id))->handle(app(MintlifyClient::class));

    expect(MintlifyArticle::where('url', 'https://docs.example.com/stale')->exists())->toBeFalse();
    expect(MintlifyArticle::where('team_id', $team->id)->count())->toBe(3);
});

test('the search service ranks articles by keyword relevance to the customer message', function () {
    [, $team] = mintlifyAgent();
    $connection = MintlifyConnection::create(['team_id' => $team->id, 'site_url' => 'https://docs.example.com', 'is_active' => true]);
    MintlifyArticle::create([
        'team_id' => $team->id,
        'mintlify_connection_id' => $connection->id,
        'title' => 'Billing FAQ',
        'url' => 'https://docs.example.com/billing-faq',
        'content_excerpt' => 'Answers to common billing and invoicing questions.',
    ]);
    MintlifyArticle::create([
        'team_id' => $team->id,
        'mintlify_connection_id' => $connection->id,
        'title' => 'Getting Started',
        'url' => 'https://docs.example.com/getting-started',
        'content_excerpt' => 'How to install and configure the product.',
    ]);

    $results = app(MintlifyArticleSearchService::class)->search($team, 'I have a question about my latest invoice and billing cycle');

    expect($results->first()->title)->toBe('Billing FAQ');
});

test('the thread help-articles endpoint suggests articles based on the last customer message', function () {
    [$user, $team] = mintlifyAgent();
    $connection = MintlifyConnection::create(['team_id' => $team->id, 'site_url' => 'https://docs.example.com', 'is_active' => true]);
    MintlifyArticle::create([
        'team_id' => $team->id,
        'mintlify_connection_id' => $connection->id,
        'title' => 'API Authentication',
        'url' => 'https://docs.example.com/api-auth',
        'content_excerpt' => 'How to authenticate requests to the public API using tokens.',
    ]);
    $thread = Thread::create([
        'team_id' => $team->id,
        'title' => 'Cannot authenticate',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);
    $thread->timelineEntries()->create([
        'actor_type' => ActorType::Tenant,
        'entry_type' => TimelineEntryType::Message,
        'body' => 'How do I authenticate my API requests using a token?',
    ]);

    $response = $this->actingAs($user)
        ->getJson("/threads/{$thread->id}/help-articles")
        ->assertOk();

    expect($response->json('articles.0.title'))->toBe('API Authentication');
});

test('a team admin can disconnect their Mintlify Help Center', function () {
    [$user, $team] = mintlifyAgent();
    $connection = MintlifyConnection::create(['team_id' => $team->id, 'site_url' => 'https://docs.example.com', 'is_active' => true]);

    $this->actingAs($user)
        ->delete("/settings/integrations/mintlify/{$connection->id}")
        ->assertRedirect();

    expect(MintlifyConnection::find($connection->id))->toBeNull();
});
