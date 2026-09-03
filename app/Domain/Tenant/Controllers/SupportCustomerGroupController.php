<?php

namespace App\Domain\Tenant\Controllers;

use App\Domain\Shared\TeamContext;
use App\Domain\Tenant\Models\CustomerGroup;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SupportCustomerGroupController extends Controller
{
    /**
     * Display listing of customer groups for management.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $groups = CustomerGroup::where('team_id', $team->id)
            ->withCount('tenants')
            ->orderBy('name')
            ->get();

        return Inertia::render('settings/groups', [
            'groups' => $groups,
        ]);
    }

    /**
     * Store a new customer group.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('customer_groups')->where('team_id', $team->id),
            ],
            'description' => 'nullable|string|max:500',
            'color' => 'nullable|string|max:50',
        ]);

        CustomerGroup::create([
            'team_id' => $team->id,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'color' => $validated['color'] ?? '#60a5fa',
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Customer group created successfully.']);

        return redirect()->back();
    }

    /**
     * Update an existing customer group.
     */
    public function update(Request $request, CustomerGroup $group): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('customer_groups')->where('team_id', $team->id)->ignore($group->id),
            ],
            'description' => 'nullable|string|max:500',
            'color' => 'nullable|string|max:50',
        ]);

        $group->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Customer group updated successfully.']);

        return redirect()->back();
    }

    /**
     * Delete a customer group.
     */
    public function destroy(Request $request, CustomerGroup $group): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $group->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Customer group deleted successfully.']);

        return redirect()->back();
    }
}
