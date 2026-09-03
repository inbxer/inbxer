<?php

namespace App\Domain\Support\Controllers;

use App\Domain\Shared\TeamContext;
use App\Domain\Support\Models\Snippet;
use App\Domain\Team\Models\Team;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SnippetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team, 403);

        app(TeamContext::class)->set($team);

        return response()->json([
            'snippets' => Snippet::where('team_id', $team->id)
                ->orderBy('name')
                ->get(['id', 'name', 'shortcut', 'body']),
        ]);
    }

    /**
     * Display the Snippets settings page.
     */
    public function settingsIndex(Request $request): Response
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team, 403);

        app(TeamContext::class)->set($team);

        return Inertia::render('settings/snippets', [
            'snippets' => Snippet::where('team_id', $team->id)
                ->with('creator:id,name')
                ->orderBy('name')
                ->get(['id', 'name', 'shortcut', 'body', 'created_by']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team, 403);

        app(TeamContext::class)->set($team);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'shortcut' => 'nullable|string|max:50',
            'body' => 'required|string',
        ]);

        Snippet::create([
            'team_id' => $team->id,
            'name' => $validated['name'],
            'shortcut' => $validated['shortcut'] ?? null,
            'body' => $validated['body'],
            'created_by' => $request->user()->id,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Snippet created.']);

        return redirect()->back();
    }

    public function update(Request $request, Snippet $snippet): RedirectResponse
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team && $snippet->team_id === $team->id, 403);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'shortcut' => 'nullable|string|max:50',
            'body' => 'required|string',
        ]);

        $snippet->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Snippet updated.']);

        return redirect()->back();
    }

    public function destroy(Request $request, Snippet $snippet): RedirectResponse
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team && $snippet->team_id === $team->id, 403);

        $snippet->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Snippet deleted.']);

        return redirect()->back();
    }
}
