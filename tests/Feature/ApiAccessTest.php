<?php

use App\Domain\Integration\Jobs\DispatchWebhookJob;
use App\Domain\Integration\Models\ApiKey;
use App\Domain\Integration\Models\Webhook;
use App\Domain\Team\Models\Team;
use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Models\Thread;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

function apiAccessAgent(): array
{
    $team = Team::factory()->create();
    $user = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($user, ['role' => 'admin']);
    $user->switchTeam($team);

    return [$user, $team];
}

test('an admin can create an api key and the raw key is only ever returned once', function () {
    [$user, $team] = apiAccessAgent();

    $response = $this->actingAs($user)
        ->post('/settings/api-keys', ['name' => 'Zapier'])
        ->assertRedirect();

    $rawKey = $response->getSession()->get('inertia.flash_data')['raw_api_key'] ?? null;
    expect($rawKey)->not->toBeNull();
    expect($rawKey)->toStartWith('cdk_');

    $apiKey = ApiKey::where('team_id', $team->id)->firstOrFail();
    expect($apiKey->name)->toBe('Zapier');
    expect($apiKey->key_prefix)->toBe(substr($rawKey, 0, 8));
    expect(Hash::check($rawKey, $apiKey->key_hash))->toBeTrue();
});

test('a created api key actually authenticates against the v1 api', function () {
    [$user, $team] = apiAccessAgent();

    $this->actingAs($user)
        ->post('/settings/api-keys', ['name' => 'Zapier']);
    $rawKey = session('inertia.flash_data')['raw_api_key'];

    Tenant::create(['team_id' => $team->id, 'name' => 'Acme', 'email' => 'acme@example.com']);

    $this->withHeaders(['Authorization' => "Bearer {$rawKey}"])
        ->getJson('/api/v1/tenants')
        ->assertOk();
});

test('an admin can revoke an api key', function () {
    [$user, $team] = apiAccessAgent();
    $apiKey = new ApiKey(['team_id' => $team->id, 'name' => 'Old key', 'created_by' => $user->id]);
    ApiKey::generateKey($apiKey);
    $apiKey->save();

    $this->actingAs($user)
        ->delete("/settings/api-keys/{$apiKey->id}")
        ->assertRedirect();

    expect(ApiKey::find($apiKey->id))->toBeNull();
});

test('an admin can create a webhook subscribed to real events with a generated secret', function () {
    [$user, $team] = apiAccessAgent();

    $this->actingAs($user)
        ->post('/settings/webhooks', [
            'url' => 'https://example.com/hooks/inbxer',
            'events' => ['thread.created', 'tenant.created'],
        ])
        ->assertRedirect();

    $webhook = Webhook::where('team_id', $team->id)->firstOrFail();
    expect($webhook->events)->toBe(['thread.created', 'tenant.created']);
    expect($webhook->secret)->toStartWith('whsec_');
    expect($webhook->is_active)->toBeTrue();
});

test('creating a webhook rejects an event name that is not real', function () {
    [$user, $team] = apiAccessAgent();

    $this->actingAs($user)
        ->post('/settings/webhooks', [
            'url' => 'https://example.com/hooks/inbxer',
            'events' => ['made.up.event'],
        ])
        ->assertSessionHasErrors('events.0');
});

test('creating a thread actually dispatches the webhook job for a subscribed webhook', function () {
    Queue::fake([DispatchWebhookJob::class]);
    [, $team] = apiAccessAgent();
    $webhook = Webhook::create([
        'team_id' => $team->id,
        'url' => 'https://example.com/hooks/inbxer',
        'secret' => 'whsec_test',
        'events' => ['thread.created'],
        'is_active' => true,
        'created_by' => User::factory()->create()->id,
    ]);

    Thread::create([
        'team_id' => $team->id,
        'title' => 'New thread',
        'status' => ThreadStatus::NeedsFirstResponse,
        'priority' => ThreadPriority::Normal,
    ]);

    Queue::assertPushed(DispatchWebhookJob::class);
});

test('a team admin can toggle a webhook active state and delete it', function () {
    [$user, $team] = apiAccessAgent();
    $webhook = Webhook::create([
        'team_id' => $team->id,
        'url' => 'https://example.com/hooks/inbxer',
        'secret' => 'whsec_test',
        'events' => ['thread.created'],
        'is_active' => true,
        'created_by' => $user->id,
    ]);

    $this->actingAs($user)
        ->patch("/settings/webhooks/{$webhook->id}", [
            'url' => $webhook->url,
            'events' => $webhook->events,
            'is_active' => false,
        ])
        ->assertRedirect();

    expect($webhook->fresh()->is_active)->toBeFalse();

    $this->actingAs($user)
        ->delete("/settings/webhooks/{$webhook->id}")
        ->assertRedirect();

    expect(Webhook::find($webhook->id))->toBeNull();
});
