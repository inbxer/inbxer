<?php

namespace App\Domain\Spam\Controllers;

use App\Domain\Shared\TeamContext;
use App\Domain\Team\Models\Team;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Models\Thread;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SpamSettingsController extends Controller
{
    private const DEFAULTS = [
        'enabled' => false,
        'blocked_keywords' => [],
        'blocked_domains' => [],
    ];

    public function index(Request $request): Response
    {
        $team = $this->currentTeam($request);

        $settings = array_replace(self::DEFAULTS, $team->settings['spam'] ?? []);

        $recentSpam = Thread::where('team_id', $team->id)
            ->where('status', ThreadStatus::Spam)
            ->with('tenant:id,name,email')
            ->latest('created_at')
            ->limit(20)
            ->get(['id', 'title', 'tenant_id', 'created_at']);

        return Inertia::render('settings/spam', [
            'settings' => $settings,
            'recentSpamCount' => Thread::where('team_id', $team->id)->where('status', ThreadStatus::Spam)->count(),
            'recentSpam' => $recentSpam->map(fn (Thread $thread) => [
                'id' => $thread->id,
                'title' => $thread->title,
                'tenant_name' => $thread->tenant?->name,
                'tenant_email' => $thread->tenant?->email,
                'created_at' => $thread->created_at?->toIso8601String(),
            ]),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $team = $this->currentTeam($request);

        $validated = $request->validate([
            'enabled' => 'boolean',
            'blocked_keywords' => 'array',
            'blocked_keywords.*' => 'string|max:255',
            'blocked_domains' => 'array',
            'blocked_domains.*' => 'string|max:255',
        ]);

        $settings = $team->settings ?? [];
        $settings['spam'] = $validated;
        $team->update(['settings' => $settings]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Spam filtering settings saved.']);

        return redirect()->back();
    }

    public function restore(Request $request, Thread $thread): RedirectResponse
    {
        $team = $this->currentTeam($request);
        abort_unless($thread->team_id === $team->id, 404);

        $thread->update(['status' => ThreadStatus::NeedsFirstResponse]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Thread restored to inbox.']);

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
