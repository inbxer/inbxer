<?php

namespace App\Domain\Ai\Controllers;

use App\Domain\Ai\Models\AiSettings;
use App\Domain\Ai\Services\AssignmentWorkflowChecker;
use App\Domain\Shared\TeamContext;
use App\Domain\Team\Models\Team;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AiPreferencesController extends Controller
{
    public function index(Request $request, AssignmentWorkflowChecker $assignmentWorkflowChecker): Response
    {
        $team = $this->currentTeam($request);
        $settings = AiSettings::forTeam($team);

        $assignmentWorkflows = $assignmentWorkflowChecker->findAssignmentWorkflows($team);

        return Inertia::render('ai/preferences', [
            'settings' => [
                'public_name' => $settings->public_name,
                'mode' => $settings->mode,
                'send_handoff_message' => $settings->send_handoff_message,
                'include_inline_links' => $settings->include_inline_links,
                'show_knowledge_citations' => $settings->show_knowledge_citations,
                'custom_instructions' => $settings->custom_instructions,
                'avatar_url' => $settings->avatarUrl(),
                'has_custom_avatar' => $settings->getFirstMedia('avatar') !== null,
            ],
            'assignmentWorkflows' => $assignmentWorkflows->map(fn ($workflow) => [
                'id' => $workflow->id,
                'name' => $workflow->name,
            ])->all(),
            'create_workflow_url' => '/workflows',
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $team = $this->currentTeam($request);
        $settings = AiSettings::forTeam($team);

        $validated = $request->validate([
            'public_name' => 'sometimes|string|max:255',
            'mode' => 'sometimes|in:shadow,live',
            'send_handoff_message' => 'sometimes|boolean',
            'include_inline_links' => 'sometimes|boolean',
            'show_knowledge_citations' => 'sometimes|boolean',
            'custom_instructions' => 'nullable|string|max:5000',
        ]);

        $settings->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'AI preferences saved.']);

        return redirect()->back();
    }

    public function uploadAvatar(Request $request): RedirectResponse
    {
        $team = $this->currentTeam($request);
        $settings = AiSettings::forTeam($team);

        $validated = $request->validate([
            'avatar' => 'required|image|max:5120',
        ]);

        $settings->addMedia($validated['avatar'])->toMediaCollection('avatar');

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Avatar updated.']);

        return redirect()->back();
    }

    public function removeAvatar(Request $request): RedirectResponse
    {
        $team = $this->currentTeam($request);
        $settings = AiSettings::forTeam($team);

        $settings->clearMediaCollection('avatar');

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Avatar removed.']);

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
