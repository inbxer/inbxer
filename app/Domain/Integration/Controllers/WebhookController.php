<?php

namespace App\Domain\Integration\Controllers;

use App\Domain\Integration\Models\Webhook;
use App\Domain\Shared\TeamContext;
use App\Domain\Team\Models\Team;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class WebhookController extends Controller
{
    /**
     * The only real domain events currently dispatched — see Thread and
     * Tenant model boot() hooks, the sole call sites of WebhookDispatcher.
     *
     * @var list<string>
     */
    public const AVAILABLE_EVENTS = [
        'thread.created',
        'thread.updated',
        'tenant.created',
        'tenant.updated',
    ];

    public function index(Request $request): Response
    {
        $team = $this->currentTeam($request);

        $webhooks = Webhook::where('team_id', $team->id)
            ->with('creator:id,name')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Webhook $webhook) => [
                'id' => $webhook->id,
                'url' => $webhook->url,
                'secret' => $webhook->secret,
                'events' => $webhook->events,
                'is_active' => $webhook->is_active,
                'creator_name' => $webhook->creator?->name,
                'last_triggered_at' => $webhook->last_triggered_at?->toIso8601String(),
                'created_at' => $webhook->created_at?->toIso8601String(),
            ]);

        return Inertia::render('settings/webhooks', [
            'webhooks' => $webhooks,
            'availableEvents' => self::AVAILABLE_EVENTS,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $team = $this->currentTeam($request);

        $validated = $request->validate([
            'url' => 'required|url|max:255',
            'events' => 'required|array|min:1',
            'events.*' => [Rule::in(self::AVAILABLE_EVENTS)],
        ]);

        Webhook::create([
            'team_id' => $team->id,
            'url' => $validated['url'],
            'secret' => 'whsec_'.Str::random(32),
            'events' => $validated['events'],
            'is_active' => true,
            'created_by' => $request->user()->id,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Webhook created.']);

        return redirect()->back();
    }

    public function update(Request $request, Webhook $webhook): RedirectResponse
    {
        $team = $this->currentTeam($request);
        abort_unless($webhook->team_id === $team->id, 404);

        $validated = $request->validate([
            'url' => 'required|url|max:255',
            'events' => 'required|array|min:1',
            'events.*' => [Rule::in(self::AVAILABLE_EVENTS)],
            'is_active' => 'boolean',
        ]);

        $webhook->update([
            'url' => $validated['url'],
            'events' => $validated['events'],
            'is_active' => $validated['is_active'] ?? $webhook->is_active,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Webhook updated.']);

        return redirect()->back();
    }

    public function destroy(Request $request, Webhook $webhook): RedirectResponse
    {
        $team = $this->currentTeam($request);
        abort_unless($webhook->team_id === $team->id, 404);

        $webhook->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Webhook deleted.']);

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
