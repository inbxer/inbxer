<?php

namespace App\Domain\Support\Controllers;

use App\Domain\Shared\TeamContext;
use App\Domain\Support\Models\SavedView;
use App\Domain\Team\Enums\TeamRole;
use App\Domain\Team\Models\Membership;
use App\Domain\Team\Models\Team;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SavedViewController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team, 403);

        app(TeamContext::class)->set($team);

        return response()->json([
            'savedViews' => SavedView::where('team_id', $team->id)
                ->orderBy('position')
                ->get(['id', 'name', 'filters', 'created_by']),
            'canManage' => $this->canManage($request, $team),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team && $this->canManage($request, $team), 403);

        app(TeamContext::class)->set($team);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'filters' => 'nullable|array',
        ]);

        $position = SavedView::where('team_id', $team->id)->max('position') ?? -1;

        SavedView::create([
            'team_id' => $team->id,
            'created_by' => $request->user()->id,
            'name' => $validated['name'],
            'filters' => $validated['filters'] ?? [],
            'position' => $position + 1,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'View saved.']);

        return redirect()->back();
    }

    public function update(Request $request, SavedView $savedView): RedirectResponse
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team && $savedView->team_id === $team->id && $this->canManage($request, $team), 403);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'filters' => 'nullable|array',
        ]);

        $savedView->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'View updated.']);

        return redirect()->back();
    }

    public function destroy(Request $request, SavedView $savedView): RedirectResponse
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team && $savedView->team_id === $team->id && $this->canManage($request, $team), 403);

        $savedView->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'View deleted.']);

        return redirect()->back();
    }

    /**
     * Determine whether the current user may create/update/delete saved views,
     * based on the team's `settings.workflow.saved_views.manage_permission` toggle.
     */
    private function canManage(Request $request, $team): bool
    {
        $permission = $team->settings['workflow']['saved_views']['manage_permission'] ?? 'everyone';

        if ($permission === 'everyone') {
            return true;
        }

        $role = Membership::where('team_id', $team->id)
            ->where('user_id', $request->user()->id)
            ->value('role');

        return $role instanceof TeamRole
            ? $role->isAtLeast(TeamRole::Admin)
            : TeamRole::tryFrom((string) $role)?->isAtLeast(TeamRole::Admin) ?? false;
    }
}
