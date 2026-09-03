<?php

namespace App\Domain\Workflow\Services;

use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Models\Thread;

/**
 * Evaluates a workflow condition step's config against a thread (or, for
 * thread-less triggers like "Customer Created", against a tenant directly).
 *
 * Config shape:
 * {
 *   "logic": "and" | "or",
 *   "conditions": [
 *     {"field": "channel", "operator": "is", "value": "chat"},
 *     {"field": "label", "operator": "is", "value": "<label_id>"}
 *   ]
 * }
 */
class WorkflowConditionEvaluator
{
    /**
     * @param  array<string, mixed>|null  $config
     */
    public function evaluate(?array $config, ?Thread $thread, ?Tenant $tenant = null): bool
    {
        $conditions = $config['conditions'] ?? [];

        if (empty($conditions)) {
            return true;
        }

        $logic = $config['logic'] ?? 'and';
        $results = array_map(fn (array $condition) => $this->evaluateCondition($condition, $thread, $tenant), $conditions);

        return $logic === 'or' ? in_array(true, $results, true) : ! in_array(false, $results, true);
    }

    /**
     * @param  array<string, mixed>  $condition
     */
    private function evaluateCondition(array $condition, ?Thread $thread, ?Tenant $tenant): bool
    {
        $field = $condition['field'] ?? null;
        $operator = $condition['operator'] ?? 'is';
        $value = $condition['value'] ?? null;

        $actual = $thread
            ? $this->resolveThreadField($field, $thread)
            : $this->resolveTenantField($field, $tenant);

        return $this->compare($actual, $operator, $value);
    }

    private function resolveThreadField(?string $field, Thread $thread): mixed
    {
        return match ($field) {
            'channel' => $thread->channel?->type?->value,
            'status' => $thread->status?->value,
            'priority' => $thread->priority?->value,
            'tier' => $thread->tier_id,
            'customer_group' => $thread->tenant?->groups?->pluck('id')->all() ?? [],
            'label' => $thread->labels()->pluck('labels.id')->all(),
            'title_contains' => $thread->title,
            'assigned' => $thread->assigned_to !== null,
            default => null,
        };
    }

    private function resolveTenantField(?string $field, ?Tenant $tenant): mixed
    {
        if (! $tenant) {
            return null;
        }

        return match ($field) {
            'tier' => $tenant->tier_id,
            'customer_group' => $tenant->groups?->pluck('id')->all() ?? [],
            default => null,
        };
    }

    private function compare(mixed $actual, string $operator, mixed $value): bool
    {
        if (is_array($value)) {
            $actualValues = is_array($actual) ? $actual : [$actual];

            return match ($operator) {
                'is', 'contains' => (bool) array_intersect($actualValues, $value),
                'is_not', 'not_contains' => ! array_intersect($actualValues, $value),
                default => false,
            };
        }

        if (is_array($actual)) {
            return match ($operator) {
                'is', 'contains' => in_array($value, $actual, true),
                'is_not', 'not_contains' => ! in_array($value, $actual, true),
                default => false,
            };
        }

        return match ($operator) {
            'is' => (string) $actual === (string) $value,
            'is_not' => (string) $actual !== (string) $value,
            'contains' => is_string($actual) && str_contains(strtolower($actual), strtolower((string) $value)),
            'not_contains' => is_string($actual) && ! str_contains(strtolower($actual), strtolower((string) $value)),
            'is_empty' => empty($actual),
            'is_not_empty' => ! empty($actual),
            default => false,
        };
    }
}
