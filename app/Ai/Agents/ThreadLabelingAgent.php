<?php

namespace App\Ai\Agents;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Promptable;
use Stringable;

/**
 * Picks which of a team's existing labels apply to a thread, based on its
 * content. Never invents new labels — only returns exact matches from the
 * list of label names it is given.
 */
class ThreadLabelingAgent implements Agent, HasStructuredOutput
{
    use Promptable;

    /**
     * @param  array<int, string>  $availableLabels
     */
    public function __construct(
        private readonly array $availableLabels,
        private readonly string $model = 'gemini-3.5-flash-lite',
        private readonly float $temperature = 0.2,
    ) {}

    /**
     * Get the instructions that the agent should follow.
     */
    public function instructions(): Stringable|string
    {
        $lines = [];

        $lines[] = 'You triage support threads by applying existing labels.';
        $lines[] = 'Here are the ONLY labels you may use (exact names): '.implode(', ', $this->availableLabels).'.';
        $lines[] = 'Given the thread content below, return the names of the labels (from that exact list) that apply.';
        $lines[] = 'Only include a label if it clearly applies. Return an empty list if none apply. Never invent a label name that is not in the list.';

        return implode("\n", $lines);
    }

    /**
     * Get the agent's structured output schema definition.
     *
     * @return array<string, Type>
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'labels' => $schema->array()
                ->items($schema->string())
                ->description('Exact names of the labels (from the provided list) that apply to this thread.')
                ->required(),
        ];
    }

    /**
     * The AI provider to prompt against.
     */
    public function provider(): string
    {
        return 'gemini';
    }

    /**
     * The model to use.
     */
    public function model(): string
    {
        return $this->model;
    }

    /**
     * The sampling temperature to use.
     */
    public function temperature(): float
    {
        return $this->temperature;
    }
}
