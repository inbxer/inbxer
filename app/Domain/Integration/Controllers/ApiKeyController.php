<?php

namespace App\Domain\Integration\Controllers;

use App\Domain\Integration\Models\ApiKey;
use App\Domain\Shared\TeamContext;
use App\Domain\Team\Models\Team;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ApiKeyController extends Controller
{
    public function index(Request $request): Response
    {
        $team = $this->currentTeam($request);

        $keys = ApiKey::where('team_id', $team->id)
            ->with('creator:id,name')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (ApiKey $key) => [
                'id' => $key->id,
                'name' => $key->name,
                'key_prefix' => $key->key_prefix,
                'creator_name' => $key->creator?->name,
                'last_used_at' => $key->last_used_at?->toIso8601String(),
                'expires_at' => $key->expires_at?->toIso8601String(),
                'is_expired' => $key->isExpired(),
                'created_at' => $key->created_at?->toIso8601String(),
            ]);

        return Inertia::render('settings/api-keys', [
            'keys' => $keys,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $team = $this->currentTeam($request);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'expires_at' => 'nullable|date|after:now',
        ]);

        $apiKey = new ApiKey([
            'team_id' => $team->id,
            'name' => $validated['name'],
            'expires_at' => $validated['expires_at'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        $rawKey = ApiKey::generateKey($apiKey);
        $apiKey->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'API key created.']);
        Inertia::flash('raw_api_key', $rawKey);

        return redirect()->back();
    }

    public function destroy(Request $request, ApiKey $apiKey): RedirectResponse
    {
        $team = $this->currentTeam($request);
        abort_unless($apiKey->team_id === $team->id, 404);

        $apiKey->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'API key revoked.']);

        return redirect()->back();
    }

    private function currentTeam(Request $request): Team
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team, 403);

        app(TeamContext::class)->set($team);

        return $team;
    }
}
