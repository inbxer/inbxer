<?php

namespace App\Domain\Thread\Controllers;

use App\Domain\Label\Models\Label;
use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Enums\TimelineEntryType;
use App\Domain\Thread\Models\Thread;
use App\Domain\Workflow\Enums\WorkflowTriggerType;
use App\Domain\Workflow\Services\WorkflowTriggerDispatcher;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ThreadLabelController extends Controller
{
    public function __construct(private readonly WorkflowTriggerDispatcher $workflowTriggers) {}

    /**
     * Sync thread labels.
     */
    public function __invoke(Request $request, Thread $thread): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'label_ids' => 'array',
            'label_ids.*' => 'exists:labels,id',
        ]);

        $newIds = $validated['label_ids'] ?? [];
        $oldIds = $thread->labels()->pluck('labels.id')->toArray();

        $addedIds = array_diff($newIds, $oldIds);
        $removedIds = array_diff($oldIds, $newIds);

        $thread->labels()->sync($newIds);

        if (! empty($addedIds)) {
            $this->workflowTriggers->dispatch($thread, WorkflowTriggerType::LabelAdded);
        }

        if (! empty($removedIds)) {
            $this->workflowTriggers->dispatch($thread, WorkflowTriggerType::LabelRemoved);
        }

        foreach ($addedIds as $labelId) {
            $lbl = Label::find($labelId);
            if ($lbl) {
                $thread->timelineEntries()->create([
                    'actor_type' => ActorType::User,
                    'actor_id' => (string) $user->id,
                    'entry_type' => TimelineEntryType::Note,
                    'is_internal' => false,
                    'body' => "You added label {$lbl->name}",
                    'metadata' => ['action' => 'add_label', 'label' => $lbl->name, 'color' => $lbl->color],
                ]);
            }
        }

        foreach ($removedIds as $labelId) {
            $lbl = Label::find($labelId);
            if ($lbl) {
                $thread->timelineEntries()->create([
                    'actor_type' => ActorType::User,
                    'actor_id' => (string) $user->id,
                    'entry_type' => TimelineEntryType::Note,
                    'is_internal' => false,
                    'body' => "You removed label {$lbl->name}",
                    'metadata' => ['action' => 'remove_label', 'label' => $lbl->name],
                ]);
            }
        }

        $thread->touch();

        return redirect()->back();
    }
}
