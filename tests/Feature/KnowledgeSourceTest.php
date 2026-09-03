<?php

use App\Domain\HelpCenter\Jobs\SyncKnowledgeSourceJob;
use App\Domain\HelpCenter\Models\KnowledgeArticle;
use App\Domain\HelpCenter\Models\KnowledgeSource;
use App\Domain\HelpCenter\Services\KnowledgeArticleSearchService;
use App\Domain\HelpCenter\Services\SitemapParser;
use App\Domain\HelpCenter\Services\WebPageFetcher;
use App\Domain\Team\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

function knowledgeAgent(): array
{
    $team = Team::factory()->create();
    $user = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($user, ['role' => 'admin']);
    $user->switchTeam($team);

    return [$user, $team];
}

const FAKE_SITEMAP_XML = <<<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url><loc>https://example.com/pricing</loc></url>
    <url><loc>https://example.com/features</loc></url>
</urlset>
XML;

function fakeHtml(string $title, string $body): string
{
    return "<html><head><title>{$title}</title></head><body><p>{$body}</p></body></html>";
}

test('adding a sitemap source dispatches the sync job', function () {
    Queue::fake([SyncKnowledgeSourceJob::class]);
    [$user, $team] = knowledgeAgent();

    $this->actingAs($user)
        ->post('/ai/knowledge-sources/sitemaps', [
            'source_url' => 'https://example.com/sitemap.xml',
        ])
        ->assertRedirect();

    $source = KnowledgeSource::where('team_id', $team->id)->firstOrFail();
    expect($source->kind->value)->toBe('sitemap');
    expect($source->source_url)->toBe('https://example.com/sitemap.xml');
    Queue::assertPushed(SyncKnowledgeSourceJob::class, fn ($job) => $job->knowledgeSourceId === $source->id);
});

test('adding a url source dispatches the sync job', function () {
    Queue::fake([SyncKnowledgeSourceJob::class]);
    [$user, $team] = knowledgeAgent();

    $this->actingAs($user)
        ->post('/ai/knowledge-sources/urls', [
            'source_url' => 'https://example.com/pricing',
        ])
        ->assertRedirect();

    $source = KnowledgeSource::where('team_id', $team->id)->firstOrFail();
    expect($source->kind->value)->toBe('url');
    Queue::assertPushed(SyncKnowledgeSourceJob::class, fn ($job) => $job->knowledgeSourceId === $source->id);
});

test('the sync job parses a sitemap and indexes each page as a knowledge article', function () {
    [, $team] = knowledgeAgent();

    Http::fake([
        'example.com/sitemap.xml' => Http::response(FAKE_SITEMAP_XML, 200),
        'example.com/pricing' => Http::response(fakeHtml('Pricing', 'Our pricing plans start at $10/month.'), 200),
        'example.com/features' => Http::response(fakeHtml('Features', 'A full list of product features.'), 200),
    ]);

    $source = KnowledgeSource::create([
        'team_id' => $team->id,
        'kind' => 'sitemap',
        'source_url' => 'https://example.com/sitemap.xml',
        'is_active' => true,
    ]);

    (new SyncKnowledgeSourceJob($source->id))->handle(app(SitemapParser::class), app(WebPageFetcher::class));

    expect(KnowledgeArticle::where('team_id', $team->id)->count())->toBe(2);
    $article = KnowledgeArticle::where('url', 'https://example.com/pricing')->firstOrFail();
    expect($article->title)->toBe('Pricing');
    expect($article->content_excerpt)->toContain('pricing plans');
    expect($source->fresh()->last_synced_at)->not->toBeNull();
});

test('the sync job indexes a single url source', function () {
    [, $team] = knowledgeAgent();

    Http::fake([
        'example.com/pricing' => Http::response(fakeHtml('Pricing', 'Our pricing plans start at $10/month.'), 200),
    ]);

    $source = KnowledgeSource::create([
        'team_id' => $team->id,
        'kind' => 'url',
        'source_url' => 'https://example.com/pricing',
        'is_active' => true,
    ]);

    (new SyncKnowledgeSourceJob($source->id))->handle(app(SitemapParser::class), app(WebPageFetcher::class));

    expect(KnowledgeArticle::where('team_id', $team->id)->count())->toBe(1);
});

test('the knowledge article search service ranks articles by keyword relevance', function () {
    [, $team] = knowledgeAgent();
    $source = KnowledgeSource::create(['team_id' => $team->id, 'kind' => 'sitemap', 'source_url' => 'https://example.com/sitemap.xml', 'is_active' => true]);
    KnowledgeArticle::create([
        'team_id' => $team->id,
        'knowledge_source_id' => $source->id,
        'title' => 'Pricing plans',
        'url' => 'https://example.com/pricing',
        'content_excerpt' => 'Details about our monthly and annual pricing plans.',
    ]);
    KnowledgeArticle::create([
        'team_id' => $team->id,
        'knowledge_source_id' => $source->id,
        'title' => 'Getting started',
        'url' => 'https://example.com/getting-started',
        'content_excerpt' => 'How to set up your account.',
    ]);

    $results = app(KnowledgeArticleSearchService::class)->search($team, 'I want to know more about your pricing plans');

    expect($results->first()->title)->toBe('Pricing plans');
});

test('a team member can remove a knowledge source', function () {
    [$user, $team] = knowledgeAgent();
    $source = KnowledgeSource::create(['team_id' => $team->id, 'kind' => 'url', 'source_url' => 'https://example.com/pricing', 'is_active' => true]);

    $this->actingAs($user)
        ->delete("/ai/knowledge-sources/{$source->id}")
        ->assertRedirect();

    expect(KnowledgeSource::find($source->id))->toBeNull();
});
