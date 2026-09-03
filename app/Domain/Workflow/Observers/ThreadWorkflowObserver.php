<?php

namespace App\Domain\Workflow\Observers;

use App\Domain\Thread\Models\Thread;
use App\Domain\Workflow\Enums\WorkflowTriggerType;
use App\Domain\Workflow\Services\WorkflowTriggerDispatcher;

/**
 * Dispatches published, enabled workflows whenever a thread is created or
 * has one of its workflow-relevant attributes changed.
 */
class ThreadWorkflowObserver
{
    public function __construct(private readonly WorkflowTriggerDispatcher $dispatcher) {}

    public function created(Thread $thread): void
    {
        $this->dispatcher->dispatch($thread, WorkflowTriggerType::ThreadCreated);
    }

    public function updated(Thread $thread): void
    {
        if ($thread->wasChanged('status')) {
            $this->dispatcher->dispatch($thread, WorkflowTriggerType::ThreadStatusChanged);
        }

        if ($thread->wasChanged('priority')) {
            $this->dispatcher->dispatch($thread, WorkflowTriggerType::PriorityChanged);
        }

        $this->dispatcher->dispatch($thread, WorkflowTriggerType::ThreadUpdated);
    }
}
