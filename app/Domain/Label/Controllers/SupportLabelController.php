<?php

namespace App\Domain\Label\Controllers;

use App\Domain\Label\Models\Label;
use App\Domain\Shared\TeamContext;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SupportLabelController extends Controller
{
    /**
     * Display listing of labels for management.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $labels = Label::where('team_id', $team->id)
            ->withCount('threads')
            ->orderBy('name')
            ->get();

        return Inertia::render('settings/labels', [
            'labels' => $labels,
        ]);
    }

    /**
     * Store a new label.
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
            'name' => 'required|string|max:255',
            'color' => 'nullable|string|max:50',
            'icon' => 'nullable|string|max:50',
            'ai_description' => 'nullable|string|max:1000',
        ]);

        Label::create([
            'team_id' => $team->id,
            'name' => $validated['name'],
            'color' => $validated['color'] ?? '#60a5fa',
            'icon' => $validated['icon'] ?? 'tag',
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Label created successfully.']);

        return redirect()->back();
    }

    /**
     * Delete a label.
     */
    public function destroy(Request $request, Label $label): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $label->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Label deleted successfully.']);

        return redirect()->back();
    }

    /**
     * Update an existing label.
     */
    public function update(Request $request, Label $label): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'color' => 'nullable|string|max:50',
            'icon' => 'nullable|string|max:50',
            'ai_description' => 'nullable|string|max:1000',
        ]);

        $label->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Label updated successfully.']);

        return redirect()->back();
    }
}
