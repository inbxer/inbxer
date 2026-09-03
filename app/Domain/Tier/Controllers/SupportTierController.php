<?php

namespace App\Domain\Tier\Controllers;

use App\Domain\Label\Models\Label;
use App\Domain\Shared\TeamContext;
use App\Domain\Sla\Models\SlaPolicy;
use App\Domain\Sla\Models\SlaPolicyCondition;
use App\Domain\Team\Models\Team;
use App\Domain\Tier\Models\Tier;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SupportTierController extends Controller
{
    /**
     * Display listing of tiers for management.
     */
    public function index(Request $request): Response
    {
        $team = $this->currentTeam($request);

        $tiers = Tier::where('team_id', $team->id)
            ->withCount('threads')
            ->with(['slaPolicies.conditions'])
            ->orderBy('name')
            ->get()
            ->map(fn (Tier $tier) => [
                ...$tier->toArray(),
                'slas' => $tier->slaPolicies->map(fn (SlaPolicy $policy) => $this->cardFor($policy)),
            ]);

        return Inertia::render('settings/tiers', [
            'tiers' => $tiers,
            'availableLabels' => Label::where('team_id', $team->id)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * Store a new tier.
     */
    public function store(Request $request): RedirectResponse
    {
        $team = $this->currentTeam($request);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'external_id' => 'nullable|string|max:255',
            'color' => 'nullable|string|max:50',
            'priority' => 'nullable|string|max:50',
            'slas' => 'nullable|array',
        ]);

        $tier = DB::transaction(function () use ($team, $validated) {
            $tier = Tier::create([
                'team_id' => $team->id,
                'name' => $validated['name'],
                'external_id' => $validated['external_id'] ?? null,
                'color' => $validated['color'] ?? '#a855f7',
                'default_priority' => $validated['priority'] ?? 'normal',
            ]);

            $this->syncSlaCards($team, $tier, $validated['slas'] ?? []);

            return $tier;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Tier created successfully.']);

        return redirect()->back();
    }

    /**
     * Delete a tier.
     */
    public function destroy(Request $request, Tier $tier): RedirectResponse
    {
        $this->currentTeam($request);

        $tier->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Tier deleted successfully.']);

        return redirect()->back();
    }

    /**
     * Update an existing tier.
     */
    public function update(Request $request, Tier $tier): RedirectResponse
    {
        $team = $this->currentTeam($request);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'external_id' => 'nullable|string|max:255',
            'color' => 'nullable|string|max:50',
            'priority' => 'nullable|string|max:50',
            'slas' => 'nullable|array',
        ]);

        DB::transaction(function () use ($team, $tier, $validated) {
            $tier->update([
                'name' => $validated['name'],
                'external_id' => $validated['external_id'] ?? null,
                'color' => $validated['color'] ?? $tier->color,
                'default_priority' => $validated['priority'] ?? $tier->default_priority->value,
            ]);

            $this->syncSlaCards($team, $tier, $validated['slas'] ?? []);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Tier updated successfully.']);

        return redirect()->back();
    }

    /**
     * Replace a tier's SLA cards with the submitted set. Existing policies
     * matching a submitted card's id are updated in place; anything not
     * submitted is removed, keeping this idempotent regardless of
     * add/remove order on the client.
     *
     * @param  array<int, array<string, mixed>>  $cards
     */
    private function syncSlaCards(Team $team, Tier $tier, array $cards): void
    {
        $labelIdsByName = Label::where('team_id', $team->id)->pluck('id', 'name');

        $keptPolicyIds = [];

        foreach ($cards as $card) {
            $minutes = (int) ($card['hours'] ?? 0) * 60 + (int) ($card['minutes'] ?? 0);
            $notifyBefore = (int) ($card['notifyBeforeHours'] ?? 0) * 60 + (int) ($card['notifyBeforeMinutes'] ?? 0);

            $attributes = [
                'team_id' => $team->id,
                'tier_id' => $tier->id,
                'type' => $card['type'] === 'next_response' ? 'next_response' : 'first_response',
                'minutes' => max(1, $minutes),
                'notify_before_minutes' => $notifyBefore > 0 ? $notifyBefore : null,
                'notify_on_breach' => (bool) ($card['notifyOnBreach'] ?? false),
                'only_business_hours' => (bool) ($card['onlyBusinessHours'] ?? false),
                'priorities' => array_values($card['priorities'] ?? []),
                'require_all_labels' => (bool) ($card['requireAllLabels'] ?? false),
                'is_active' => true,
            ];

            // A client-generated id (freshly added card) always creates a new
            // row; only a real, existing policy id is eligible for update.
            $existingId = is_string($card['id'] ?? null) && ! str_starts_with($card['id'], 'sla_')
                ? $card['id']
                : null;

            $policy = $existingId
                ? SlaPolicy::where('id', $existingId)->where('tier_id', $tier->id)->first()
                : null;

            $policy = $policy
                ? tap($policy)->update($attributes)
                : SlaPolicy::create($attributes);

            $keptPolicyIds[] = $policy->id;

            $labelIds = collect($card['labels'] ?? [])
                ->map(fn ($label) => $labelIdsByName->get($label))
                ->filter()
                ->values();

            $policy->conditions()->delete();
            foreach ($labelIds as $labelId) {
                SlaPolicyCondition::create([
                    'sla_policy_id' => $policy->id,
                    'condition_type' => 'label',
                    'condition_id' => $labelId,
                ]);
            }
        }

        SlaPolicy::where('tier_id', $tier->id)
            ->whereNotIn('id', $keptPolicyIds ?: ['__none__'])
            ->delete();
    }

    /**
     * @return array<string, mixed>
     */
    private function cardFor(SlaPolicy $policy): array
    {
        $labelNames = $policy->conditions
            ->where('condition_type', 'label')
            ->pluck('condition_id')
            ->map(fn ($id) => Label::find($id)?->name)
            ->filter()
            ->values()
            ->all();

        $notifyBefore = $policy->notify_before_minutes ?? 0;

        return [
            'id' => $policy->id,
            'type' => $policy->type,
            'hours' => intdiv($policy->minutes, 60),
            'minutes' => $policy->minutes % 60,
            'onlyBusinessHours' => $policy->only_business_hours,
            'priorities' => $policy->priorities ?? [],
            'labels' => $labelNames,
            'requireAllLabels' => $policy->require_all_labels,
            'notifyBeforeHours' => intdiv($notifyBefore, 60),
            'notifyBeforeMinutes' => $notifyBefore % 60,
            'notifyOnBreach' => $policy->notify_on_breach,
        ];
    }

    private function currentTeam(Request $request): Team
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team, 403);

        app(TeamContext::class)->set($team);

        return $team;
    }
}
