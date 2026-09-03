<?php

namespace App\Domain\Thread\Enums;

enum TimelineEntryType: string
{
    case Message = 'message';
    case Note = 'note';
    case StatusChange = 'status_change';
    case Assignment = 'assignment';
    case LabelAdded = 'label_added';
    case LabelRemoved = 'label_removed';
    case PriorityChange = 'priority_change';
    case FieldChange = 'field_change';
    case SlaBreach = 'sla_breach';
    case Escalation = 'escalation';
    case WorkflowAction = 'workflow_action';
    case AiSuggestion = 'ai_suggestion';

    /**
     * Get the display label for the entry type.
     */
    public function label(): string
    {
        return match ($this) {
            self::Message => 'Message',
            self::Note => 'Internal Note',
            self::StatusChange => 'Status Changed',
            self::Assignment => 'Assignment Changed',
            self::LabelAdded => 'Label Added',
            self::LabelRemoved => 'Label Removed',
            self::PriorityChange => 'Priority Changed',
            self::FieldChange => 'Field Updated',
            self::SlaBreach => 'SLA Breached',
            self::Escalation => 'Escalated',
            self::WorkflowAction => 'Workflow Action',
            self::AiSuggestion => 'AI Suggestion',
        };
    }

    /**
     * Determine if this entry type represents user-visible content.
     */
    public function isCustomerFacing(): bool
    {
        return $this === self::Message;
    }

    /**
     * Determine if this entry type represents an automated system event.
     */
    public function isSystemEvent(): bool
    {
        return in_array($this, [
            self::StatusChange,
            self::Assignment,
            self::LabelAdded,
            self::LabelRemoved,
            self::PriorityChange,
            self::FieldChange,
            self::SlaBreach,
            self::Escalation,
            self::WorkflowAction,
        ]);
    }
}
