<?php

namespace App\Domain\Ai\Controllers;

use App\Domain\Ai\Enums\AiActivityStatus;
use App\Domain\Ai\Models\AiActivityLogEntry;
use App\Domain\Ai\Models\AiSettings;
use App\Domain\Ai\Services\AssignmentWorkflowChecker;
use App\Domain\HelpCenter\Models\MintlifyArticle;
use App\Domain\HelpCenter\Models\MintlifyConnection;
use App\Domain\Shared\TeamContext;
use App\Domain\Team\Models\Team;
use App\Domain\Thread\Models\Thread;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class AiOverviewController extends Controller
{
    public function index(Request $request, AssignmentWorkflowChecker $assignmentWorkflowChecker): Response
    {
        $team = $this->currentTeam($request);

        $settings = AiSettings::forTeam($team);

        $since = Carbon::now()->subDays(30);

        $eligibleThreadCount = Thread::where('team_id', $team->id)
            ->where('created_at', '>=', $since)
            ->count();

        $repliedThreadCount = AiActivityLogEntry::where('team_id', $team->id)
            ->where('created_at', '>=', $since)
            ->distinct('thread_id')
            ->count('thread_id');

        $participationRate = $eligibleThreadCount > 0
            ? round(($repliedThreadCount / $eligibleThreadCount) * 100, 1)
            : 0.0;

        $handoffBreakdown = AiActivityLogEntry::where('team_id', $team->id)
            ->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $connection = MintlifyConnection::where('team_id', $team->id)->first();
        $articlesCount = $connection ? MintlifyArticle::where('mintlify_connection_id', $connection->id)->count() : 0;

        return Inertia::render('ai/overview', [
            'mode' => $settings->mode,
            'checklist' => [
                'has_knowledge_sources' => $connection?->is_active === true && $articlesCount > 0,
                'has_assignment_workflows' => $assignmentWorkflowChecker->hasAssignmentWorkflow($team),
                'has_tone_rules' => filled($settings->tone_rules),
            ],
            'threadParticipationPercent' => $eligibleThreadCount > 0 ? $participationRate : null,
            'handoffBreakdown' => [
                'sent' => (int) ($handoffBreakdown[AiActivityStatus::Sent->value] ?? 0),
                'pending_review' => (int) ($handoffBreakdown[AiActivityStatus::PendingReview->value] ?? 0),
                'edited' => (int) ($handoffBreakdown[AiActivityStatus::Edited->value] ?? 0),
                'rejected' => (int) ($handoffBreakdown[AiActivityStatus::Rejected->value] ?? 0),
            ],
            'knowledgeHealth' => [
                'connected' => (bool) $connection,
                'articles_count' => $articlesCount,
                'indexed_count' => $articlesCount,
                'pending_count' => 0,
                'failed_count' => 0,
            ],
            'create_workflow_url' => '/workflows',
        ]);
    }

    private function currentTeam(Request $request): Team
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team, 403);

        app(TeamContext::class)->set($team);

        return $team;
    }
}
