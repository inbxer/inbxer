<?php

namespace App\Domain\Workflow\Controllers;

use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Models\Channel;
use App\Domain\Label\Models\Label;
use App\Domain\Shared\TeamContext;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Models\Thread;
use App\Domain\Tier\Models\Tier;
use App\Domain\Workflow\Enums\WorkflowStatus;
use App\Domain\Workflow\Enums\WorkflowStepType;
use App\Domain\Workflow\Enums\WorkflowTriggerType;
use App\Domain\Workflow\Jobs\RunWorkflowsForThread;
use App\Domain\Workflow\Models\Workflow;
use App\Domain\Workflow\Models\WorkflowRun;
use App\Domain\Workflow\Services\WorkflowTemplateLibrary;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class WorkflowController extends Controller
{
    /**
     * List workflows for the current team.
     */
    public function index(Request $request): Response
    {
        $team = $request->user()?->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $workflows = Workflow::where('team_id', $team->id)
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (Workflow $workflow) => [
                'id' => $workflow->id,
                'name' => $workflow->name,
                'status' => $workflow->status->value,
                'trigger_type' => $workflow->trigger_type->value,
                'trigger_label' => $workflow->trigger_type->label(),
                'is_enabled' => $workflow->is_enabled,
                'last_triggered_at' => $workflow->last_triggered_at?->toIso8601String(),
                'updated_at' => $workflow->updated_at?->toIso8601String(),
            ]);

        return Inertia::render('workflows/index', [
            'workflows' => $workflows,
            'triggerOptions' => $this->triggerOptions(),
            'templates' => WorkflowTemplateLibrary::summaries(),
        ]);
    }

    /**
     * List execution runs across all of the team's workflows, with each
     * run's step-by-step log for inspection/debugging.
     */
    public function runs(Request $request): Response
    {
        $team = $request->user()?->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $runs = WorkflowRun::query()
            ->whereHas('workflow', fn ($q) => $q->where('team_id', $team->id))
            ->with(['workflow:id,name', 'thread:id,title,sequence_number', 'tenant:id,name', 'logs.step'])
            ->orderByDesc('started_at')
            ->paginate(50)
            ->through(fn (WorkflowRun $run) => [
                'id' => $run->id,
                'workflow_id' => $run->workflow_id,
                'workflow_name' => $run->workflow->name ?? 'Deleted workflow',
                'status' => $run->status->value,
                'status_label' => $run->status->label(),
                'status_color' => $run->status->color(),
                'started_at' => $run->started_at?->toIso8601String(),
                'duration_seconds' => $run->durationInSeconds(),
                'error_message' => $run->error_message,
                'subject' => $run->thread
                    ? ['type' => 'thread', 'label' => $run->thread->title ?? "T-{$run->thread->sequence_number}"]
                    : ($run->tenant ? ['type' => 'tenant', 'label' => $run->tenant->name] : null),
                'logs' => $run->logs->map(fn ($log) => [
                    'id' => $log->id,
                    'step_type' => $log->step?->type?->value,
                    'action_type' => $log->step?->action_type,
                    'status' => $log->status->value,
                    'output' => $log->output,
                    'executed_at' => $log->executed_at?->toIso8601String(),
                ])->values()->all(),
            ]);

        return Inertia::render('workflows/runs', [
            'runs' => $runs,
            'workflows' => Workflow::where('team_id', $team->id)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * Display the featured workflow templates gallery.
     */
    public function templates(Request $request): Response
    {
        $team = $request->user()?->currentTeam;

        if (! $team) {
            abort(403);
        }

        return Inertia::render('workflows/templates', [
            'templates' => WorkflowTemplateLibrary::all(),
        ]);
    }

    /**
     * Create a new workflow and redirect straight to the builder. With no
     * body at all this creates an empty "Untitled workflow" draft; a
     * `template` key pre-fills it from the template library.
     */
    public function store(Request $request): RedirectResponse
    {
        $team = $request->user()?->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'trigger_type' => ['nullable', Rule::enum(WorkflowTriggerType::class)],
            'template' => 'nullable|string',
        ]);

        $template = ! empty($validated['template'])
            ? WorkflowTemplateLibrary::find($validated['template'])
            : null;

        $workflow = Workflow::create([
            'team_id' => $team->id,
            'name' => ($validated['name'] ?? null) ?: ($template['name'] ?? 'Untitled workflow'),
            'status' => WorkflowStatus::Draft,
            'trigger_type' => $validated['trigger_type'] ?? $template['trigger_type'] ?? WorkflowTriggerType::ThreadCreated,
            'is_enabled' => false,
        ]);

        if ($template) {
            $this->saveSteps($workflow, $template['steps']);
        }

        return redirect()->route('workflows.show', [
            'workflow' => $workflow->id,
        ]);
    }

    /**
     * Display the workflow builder for a single workflow.
     */
    public function show(Request $request, Workflow $workflow): Response
    {
        $team = $request->user()?->currentTeam;

        if (! $team || $workflow->team_id !== $team->id) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $workflow->load('steps');

        return Inertia::render('workflows/builder', [
            'workflow' => [
                'id' => $workflow->id,
                'name' => $workflow->name,
                'status' => $workflow->status->value,
                'trigger_type' => $workflow->trigger_type->value,
                'is_enabled' => $workflow->is_enabled,
            ],
            'steps' => $workflow->steps->map(fn ($step) => [
                'id' => $step->id,
                'type' => $step->type->value,
                'action_type' => $step->action_type,
                'config' => $step->config,
                'position' => $step->position,
                'parent_step_id' => $step->parent_step_id,
                'branch' => $step->branch,
            ]),
            'triggerOptions' => $this->triggerOptions(),
            'actionOptions' => $this->actionOptions(),
            'conditionFields' => $this->conditionFields(),
            'teamMembers' => $team->members()->select('users.id', 'users.name', 'users.email')->get(),
            'availableLabels' => Label::where('team_id', $team->id)->orderBy('name')->get(['id', 'name', 'color']),
            'availableTiers' => Tier::where('team_id', $team->id)->orderBy('name')->get(['id', 'name']),
            'slackWorkspaces' => Channel::where('team_id', $team->id)->where('type', ChannelType::Slack)->get(['id', 'name']),
        ]);
    }

    /**
     * Save the workflow's metadata and full step graph.
     */
    public function update(Request $request, Workflow $workflow): RedirectResponse
    {
        $team = $request->user()?->currentTeam;

        if (! $team || $workflow->team_id !== $team->id) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'trigger_type' => ['required', Rule::enum(WorkflowTriggerType::class)],
            'steps' => 'array',
            'steps.*.client_id' => 'required|string',
            'steps.*.type' => ['required', Rule::enum(WorkflowStepType::class)],
            'steps.*.action_type' => 'nullable|string|max:100',
            'steps.*.config' => 'nullable|array',
            'steps.*.position' => 'required|integer|min:0',
            'steps.*.parent_client_id' => 'nullable|string',
            'steps.*.branch' => 'nullable|string|max:50',
        ]);

        DB::transaction(function () use ($workflow, $validated) {
            $workflow->update([
                'name' => $validated['name'],
                'trigger_type' => $validated['trigger_type'],
            ]);

            $this->saveSteps($workflow, $validated['steps'] ?? [], clientKeyed: true);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Workflow saved.']);

        return redirect()->back();
    }

    /**
     * Publish (and enable) a workflow.
     */
    public function publish(Request $request, Workflow $workflow): RedirectResponse
    {
        $team = $request->user()?->currentTeam;

        if (! $team || $workflow->team_id !== $team->id) {
            abort(403);
        }

        $workflow->update(['status' => WorkflowStatus::Published, 'is_enabled' => true]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Workflow published.']);

        return redirect()->back();
    }

    /**
     * Unpublish a workflow, moving it back to draft and disabling it.
     */
    public function unpublish(Request $request, Workflow $workflow): RedirectResponse
    {
        $team = $request->user()?->currentTeam;

        if (! $team || $workflow->team_id !== $team->id) {
            abort(403);
        }

        $workflow->update(['status' => WorkflowStatus::Draft, 'is_enabled' => false]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Workflow unpublished.']);

        return redirect()->back();
    }

    /**
     * Manually run a Manual-trigger workflow against a specific thread.
     */
    public function run(Request $request, Workflow $workflow): RedirectResponse
    {
        $team = $request->user()?->currentTeam;

        if (! $team || $workflow->team_id !== $team->id) {
            abort(403);
        }

        abort_unless($workflow->trigger_type === WorkflowTriggerType::Manual, 422, 'Only manual-trigger workflows can be run directly.');
        abort_unless($workflow->canExecute(), 422, 'This workflow must be published and enabled before it can run.');

        $validated = $request->validate(['thread_id' => 'required|string']);

        $thread = Thread::where('team_id', $team->id)->where('id', $validated['thread_id'])->firstOrFail();

        RunWorkflowsForThread::dispatch($workflow->id, $thread->id, WorkflowTriggerType::Manual);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Running \"{$workflow->name}\"…"]);

        return redirect()->back();
    }

    /**
     * Delete a workflow.
     */
    public function destroy(Request $request, Workflow $workflow): RedirectResponse
    {
        $team = $request->user()?->currentTeam;

        if (! $team || $workflow->team_id !== $team->id) {
            abort(403);
        }

        $workflow->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Workflow deleted.']);

        return redirect()->route('workflows.index');
    }

    /**
     * Replace a workflow's entire step tree. Steps are keyed by a
     * caller-supplied `client_id` so parent/child links can be resolved in
     * two passes without needing real IDs up front.
     *
     * @param  array<int, array<string, mixed>>  $steps
     */
    private function saveSteps(Workflow $workflow, array $steps, bool $clientKeyed = false): void
    {
        $workflow->steps()->delete();

        $idMap = [];
        foreach ($steps as $step) {
            $created = $workflow->steps()->create([
                'type' => $step['type'],
                'action_type' => $step['action_type'] ?? '',
                'config' => $step['config'] ?? [],
                'position' => $step['position'],
                'branch' => $step['branch'] ?? null,
            ]);

            $key = $clientKeyed ? $step['client_id'] : ($step['client_id'] ?? $step['id'] ?? null);

            if ($key !== null) {
                $idMap[$key] = $created->id;
            }
        }

        foreach ($steps as $step) {
            $key = $clientKeyed ? $step['client_id'] : ($step['client_id'] ?? $step['id'] ?? null);
            $parentKey = $step['parent_client_id'] ?? null;

            if ($parentKey && isset($idMap[$parentKey]) && $key !== null) {
                $workflow->steps()
                    ->where('id', $idMap[$key])
                    ->update(['parent_step_id' => $idMap[$parentKey]]);
            }
        }
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function triggerOptions(): array
    {
        return array_map(
            fn (WorkflowTriggerType $type) => ['value' => $type->value, 'label' => $type->label()],
            WorkflowTriggerType::cases(),
        );
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function actionOptions(): array
    {
        return [
            ['value' => 'apply_labels', 'label' => 'Apply labels'],
            ['value' => 'remove_labels', 'label' => 'Remove labels'],
            ['value' => 'assign_to_user', 'label' => 'Assign to user'],
            ['value' => 'unassign_thread', 'label' => 'Unassign thread'],
            ['value' => 'set_priority', 'label' => 'Set priority'],
            ['value' => 'set_status', 'label' => 'Set status'],
            ['value' => 'set_tier', 'label' => 'Set tier'],
            ['value' => 'add_note', 'label' => 'Add note'],
            ['value' => 'lock_thread', 'label' => 'Lock thread'],
            ['value' => 'assign_to_ai', 'label' => 'Assign to AI Agent'],
            ['value' => 'send_slack_notification', 'label' => 'Send Slack notification'],
            ['value' => 'send_http_request', 'label' => 'Send HTTP request'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function conditionFields(): array
    {
        return [
            'fields' => [
                ['value' => 'channel', 'label' => 'Channel'],
                ['value' => 'label', 'label' => 'Label'],
                ['value' => 'status', 'label' => 'Status'],
                ['value' => 'priority', 'label' => 'Priority'],
                ['value' => 'tier', 'label' => 'Tier'],
                ['value' => 'customer_group', 'label' => 'Customer group'],
                ['value' => 'title_contains', 'label' => 'Title contains'],
                ['value' => 'assigned', 'label' => 'Is assigned'],
            ],
            'operators' => [
                ['value' => 'is', 'label' => 'Is'],
                ['value' => 'is_not', 'label' => 'Is not'],
                ['value' => 'contains', 'label' => 'Contains'],
                ['value' => 'not_contains', 'label' => 'Does not contain'],
                ['value' => 'is_empty', 'label' => 'Is empty'],
                ['value' => 'is_not_empty', 'label' => 'Is not empty'],
            ],
            'statuses' => array_map(fn (ThreadStatus $s) => ['value' => $s->value, 'label' => $s->label()], ThreadStatus::cases()),
            'priorities' => array_map(fn (ThreadPriority $p) => ['value' => $p->value, 'label' => ucfirst($p->value)], ThreadPriority::cases()),
        ];
    }
}
