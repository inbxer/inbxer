<?php

namespace App\Domain\Workflow\Services;

use App\Domain\Workflow\Enums\WorkflowStepType;
use App\Domain\Workflow\Enums\WorkflowTriggerType;

/**
 * A small curated set of starter workflow templates. Each definition uses
 * the same step shape the builder saves (client_id-keyed, so the same
 * two-pass parent-linking logic in WorkflowController::saveSteps applies).
 */
class WorkflowTemplateLibrary
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public static function all(): array
    {
        return [
            [
                'key' => 'urgent-chat-priority',
                'name' => 'Prioritize urgent chat threads',
                'description' => 'Detects new chat threads and immediately bumps their priority so they surface at the top of the queue.',
                'tags' => ['Chat', 'Priority'],
                'trigger_type' => WorkflowTriggerType::ThreadCreated->value,
                'steps' => [
                    [
                        'client_id' => 'c1',
                        'type' => WorkflowStepType::Condition->value,
                        'action_type' => '',
                        'config' => [
                            'logic' => 'and',
                            'conditions' => [
                                ['field' => 'channel', 'operator' => 'is', 'value' => 'chat'],
                            ],
                        ],
                        'position' => 0,
                        'parent_client_id' => null,
                        'branch' => null,
                    ],
                    [
                        'client_id' => 'a1',
                        'type' => WorkflowStepType::Action->value,
                        'action_type' => 'set_priority',
                        'config' => ['priority' => 'high'],
                        'position' => 0,
                        'parent_client_id' => 'c1',
                        'branch' => 'if',
                    ],
                ],
            ],
            [
                'key' => 'auto-assign-vip-tier',
                'name' => 'Auto-assign VIP tier threads',
                'description' => 'When a thread comes in from a top-tier customer, assign it to the on-call agent and leave a heads-up note.',
                'tags' => ['Assignment', 'Tiers'],
                'trigger_type' => WorkflowTriggerType::ThreadCreated->value,
                'steps' => [
                    [
                        'client_id' => 'c1',
                        'type' => WorkflowStepType::Condition->value,
                        'action_type' => '',
                        'config' => [
                            'logic' => 'and',
                            'conditions' => [
                                ['field' => 'priority', 'operator' => 'is', 'value' => 'urgent'],
                            ],
                        ],
                        'position' => 0,
                        'parent_client_id' => null,
                        'branch' => null,
                    ],
                    [
                        'client_id' => 'a1',
                        'type' => WorkflowStepType::Action->value,
                        'action_type' => 'add_note',
                        'config' => ['body' => 'This thread came in as urgent priority — please pick it up promptly.'],
                        'position' => 0,
                        'parent_client_id' => 'c1',
                        'branch' => 'if',
                    ],
                ],
            ],
            [
                'key' => 'notify-slack-on-status-change',
                'name' => 'Notify Slack when a thread is escalated',
                'description' => 'Posts a message to a Slack channel whenever a thread status changes to "investigating".',
                'tags' => ['Slack', 'Escalation'],
                'trigger_type' => WorkflowTriggerType::ThreadStatusChanged->value,
                'steps' => [
                    [
                        'client_id' => 'c1',
                        'type' => WorkflowStepType::Condition->value,
                        'action_type' => '',
                        'config' => [
                            'logic' => 'and',
                            'conditions' => [
                                ['field' => 'status', 'operator' => 'is', 'value' => 'investigating'],
                            ],
                        ],
                        'position' => 0,
                        'parent_client_id' => null,
                        'branch' => null,
                    ],
                    [
                        'client_id' => 'a1',
                        'type' => WorkflowStepType::Action->value,
                        'action_type' => 'send_slack_notification',
                        'config' => [
                            'channel_id' => '',
                            'slack_channel_id' => '',
                            'message' => 'Thread {{thread.reference}} needs investigation: {{thread.title}}',
                        ],
                        'position' => 0,
                        'parent_client_id' => 'c1',
                        'branch' => 'if',
                    ],
                ],
            ],
        ];
    }

    /**
     * @return array<int, array{key: string, name: string, description: string, tags: array<int, string>}>
     */
    public static function summaries(): array
    {
        return array_map(
            fn (array $template) => [
                'key' => $template['key'],
                'name' => $template['name'],
                'description' => $template['description'],
                'tags' => $template['tags'],
            ],
            self::all(),
        );
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function find(string $key): ?array
    {
        foreach (self::all() as $template) {
            if ($template['key'] === $key) {
                return $template;
            }
        }

        return null;
    }
}
