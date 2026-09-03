<?php

use App\Domain\Team\Models\Team;
use App\Domain\Tenant\Models\CustomerGroup;
use App\Domain\Tenant\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function customerGroupAgent(): array
{
    $team = Team::factory()->create();
    $user = User::factory()->create(['current_team_id' => $team->id]);
    $team->members()->attach($user, ['role' => 'admin']);
    $user->switchTeam($team);

    return [$user, $team];
}

test('an admin can create a customer group', function () {
    [$user, $team] = customerGroupAgent();

    $this->actingAs($user)
        ->post('/settings/groups', [
            'name' => 'VIP customers',
            'description' => 'High-value accounts',
            'color' => '#f43f5e',
        ])
        ->assertRedirect();

    $group = CustomerGroup::where('team_id', $team->id)->firstOrFail();
    expect($group->name)->toBe('VIP customers');
    expect($group->description)->toBe('High-value accounts');
    expect($group->color)->toBe('#f43f5e');
});

test('the groups settings page lists real groups with their tenant counts', function () {
    [$user, $team] = customerGroupAgent();
    $group = CustomerGroup::create(['team_id' => $team->id, 'name' => 'Beta testers', 'color' => '#60a5fa']);
    $tenant = Tenant::create(['team_id' => $team->id, 'name' => 'Acme', 'email' => 'acme@example.com']);
    $group->tenants()->attach($tenant->id);

    $this->actingAs($user)
        ->get('/settings/groups')
        ->assertInertia(fn ($page) => $page
            ->where('groups.0.name', 'Beta testers')
            ->where('groups.0.tenants_count', 1));
});

test('an admin can rename and delete a customer group', function () {
    [$user, $team] = customerGroupAgent();
    $group = CustomerGroup::create(['team_id' => $team->id, 'name' => 'Old name', 'color' => '#60a5fa']);

    $this->actingAs($user)
        ->patch("/settings/groups/{$group->id}", [
            'name' => 'New name',
            'description' => null,
            'color' => '#34d399',
        ])
        ->assertRedirect();

    expect($group->fresh()->name)->toBe('New name');

    $this->actingAs($user)
        ->delete("/settings/groups/{$group->id}")
        ->assertRedirect();

    expect(CustomerGroup::find($group->id))->toBeNull();
});

test('a customer group cannot be created with a duplicate name for the same team', function () {
    [$user, $team] = customerGroupAgent();
    CustomerGroup::create(['team_id' => $team->id, 'name' => 'Beta testers', 'color' => '#60a5fa']);

    $this->actingAs($user)
        ->post('/settings/groups', ['name' => 'Beta testers'])
        ->assertSessionHasErrors();
});

test('a tenant can be assigned to and removed from customer groups', function () {
    [$user, $team] = customerGroupAgent();
    $tenant = Tenant::create(['team_id' => $team->id, 'name' => 'Acme', 'email' => 'acme@example.com']);
    $groupA = CustomerGroup::create(['team_id' => $team->id, 'name' => 'Group A', 'color' => '#60a5fa']);
    $groupB = CustomerGroup::create(['team_id' => $team->id, 'name' => 'Group B', 'color' => '#f43f5e']);

    $this->actingAs($user)
        ->post("/tenants/{$tenant->id}/groups", [
            'group_ids' => [$groupA->id, $groupB->id],
        ])
        ->assertRedirect();

    expect($tenant->groups()->pluck('customer_groups.id')->sort()->values()->all())
        ->toBe(collect([$groupA->id, $groupB->id])->sort()->values()->all());

    $this->actingAs($user)
        ->post("/tenants/{$tenant->id}/groups", [
            'group_ids' => [$groupA->id],
        ])
        ->assertRedirect();

    expect($tenant->groups()->pluck('customer_groups.id')->all())->toBe([$groupA->id]);
});

test('the tenant details page returns the tenant real groups and available team groups', function () {
    [$user, $team] = customerGroupAgent();
    $tenant = Tenant::create(['team_id' => $team->id, 'name' => 'Acme', 'email' => 'acme@example.com']);
    $group = CustomerGroup::create(['team_id' => $team->id, 'name' => 'VIP', 'color' => '#f43f5e']);
    $tenant->groups()->attach($group->id);

    $this->actingAs($user)
        ->get("/tenants/{$tenant->id}")
        ->assertInertia(fn ($page) => $page
            ->where('tenant.groups.0.name', 'VIP')
            ->where('groups.0.name', 'VIP'));
});
