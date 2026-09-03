<?php

namespace App\Domain\Workflow\Observers;

use App\Domain\Tenant\Models\Tenant;
use App\Domain\Workflow\Enums\WorkflowTriggerType;
use App\Domain\Workflow\Services\WorkflowTriggerDispatcher;

/**
 * Dispatches published, enabled "Customer Created" workflows whenever a
 * new tenant is created.
 */
class TenantWorkflowObserver
{
    public function __construct(private readonly WorkflowTriggerDispatcher $dispatcher) {}

    public function created(Tenant $tenant): void
    {
        $this->dispatcher->dispatchForTenant($tenant, WorkflowTriggerType::CustomerCreated);
    }
}
