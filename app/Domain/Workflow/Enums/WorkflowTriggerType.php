<?php

namespace App\Domain\Workflow\Enums;

enum WorkflowTriggerType: string
{
    case Manual = 'manual';
    case ThreadCreated = 'thread_created';
    case ThreadUpdated = 'thread_updated';
    case ThreadStatusChanged = 'thread_status_changed';
    case LabelAdded = 'label_added';
    case LabelRemoved = 'label_removed';
    case PriorityChanged = 'priority_changed';
    case SlaBr = 'sla_breached';
    case SlaApproachingBreach = 'sla_approaching_breach';
    case CustomerCreated = 'customer_created';
    case InboundMessage = 'inbound_message';

    /**
     * Get the display label for the trigger type.
     */
    public function label(): string
    {
        return match ($this) {
            self::Manual => 'Manual Trigger',
            self::ThreadCreated => 'Thread Created',
            self::ThreadUpdated => 'Thread Updated',
            self::ThreadStatusChanged => 'Thread Status Changed',
            self::LabelAdded => 'Label Added',
            self::LabelRemoved => 'Label Removed',
            self::PriorityChanged => 'Priority Changed',
            self::SlaBr => 'SLA Breached',
            self::SlaApproachingBreach => 'SLA Approaching Breach',
            self::CustomerCreated => 'Customer Created',
            self::InboundMessage => 'Inbound Message Received',
        };
    }

    /**
     * Determine if this trigger fires automatically (event-driven).
     */
    public function isAutomatic(): bool
    {
        return $this !== self::Manual;
    }
}
