<?php

namespace App\Domain\Ai\Controllers;

use App\Domain\Ai\Enums\AiActivityStatus;
use App\Domain\Ai\Models\AiActivityLogEntry;
use App\Domain\Ai\Models\AiSettings;
use App\Domain\Ai\Services\AiDispatcher;
use App\Domain\Shared\TeamContext;
use App\Domain\Team\Models\Team;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AiActivityController extends Controller
{
    public function index(Request $request): Response
    {
        $team = $this->currentTeam($request);
        $settings = AiSettings::forTeam($team);

        $status = $request->string('status')->toString() ?: 'all';

        $query = AiActivityLogEntry::where('team_id', $team->id)->with('thread');

        match ($status) {
            'responded' => $query->responded(),
            'handed_off' => $query->handedOff(),
            'knowledge_gaps' => $query->knowledgeGaps(),
            default => null,
        };

        $entries = $query->latest('created_at')->paginate(20)->withQueryString();

        return Inertia::render('ai/activity', [
            'entries' => $entries->through(fn (AiActivityLogEntry $entry) => [
                'id' => $entry->id,
                'thread' => [
                    'id' => $entry->thread_id,
                    'subject' => $entry->thread?->title,
                ],
                'generated_reply' => $entry->generated_reply,
                'matched_articles' => $entry->matched_articles ?? [],
                'status' => $entry->status->value,
                'created_at' => $entry->created_at?->toIso8601String(),
            ]),
            'status' => $status,
            'mode' => $settings->mode,
        ]);
    }

    public function approve(Request $request, AiActivityLogEntry $log): RedirectResponse
    {
        $team = $this->currentTeam($request);
        abort_unless($log->team_id === $team->id, 404);

        $validated = $request->validate([
            'generated_reply' => 'nullable|string',
        ]);

        $edited = filled($validated['generated_reply'] ?? null) && $validated['generated_reply'] !== $log->generated_reply;

        if ($edited) {
            $log->generated_reply = $validated['generated_reply'];
        }

        $log->reviewed_by = $request->user()?->id;
        $log->save();

        app(AiDispatcher::class)->send($log->thread, $log);

        $log->update(['status' => $edited ? AiActivityStatus::Edited : AiActivityStatus::Sent]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Reply sent.']);

        return redirect()->back();
    }

    public function reject(Request $request, AiActivityLogEntry $log): RedirectResponse
    {
        $team = $this->currentTeam($request);
        abort_unless($log->team_id === $team->id, 404);

        $log->update([
            'status' => AiActivityStatus::Rejected,
            'reviewed_by' => $request->user()?->id,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Handed off to a human agent.']);

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
