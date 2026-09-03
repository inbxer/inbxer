<?php

namespace App\Domain\Workflow\Observers;

use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Enums\TimelineEntryType;
use App\Domain\Thread\Models\ThreadTimelineEntry;
use App\Domain\Workflow\Enums\WorkflowTriggerType;
use App\Domain\Workflow\Services\WorkflowTriggerDispatcher;

/**
 * Fires the "Inbound message received" workflow trigger whenever a
 * customer-facing message timeline entry is created.
 */
class ThreadTimelineEntryWorkflowObserver
{
    public function __construct(private readonly WorkflowTriggerDispatcher $dispatcher) {}

    public function created(ThreadTimelineEntry $entry): void
    {
        if ($entry->entry_type !== TimelineEntryType::Message || $entry->actor_type !== ActorType::Tenant) {
            return;
        }

        $thread = $entry->thread;

        if ($thread) {
            $this->dispatcher->dispatch($thread, WorkflowTriggerType::InboundMessage);
        }
    }
}
