<?php

namespace App\Ai\Agents;

use App\Domain\Thread\Enums\ThreadPriority;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Promptable;
use Stringable;

/**
 * Classifies how urgent a thread is, into one of ThreadPriority's exact
 * cases, based on the customer's message content.
 */
class ThreadUrgencyAgent implements Agent, HasStructuredOutput
{
    use Promptable;

    public function __construct(
        private readonly string $model = 'gemini-3.5-flash-lite',
        private readonly float $temperature = 0.2,
    ) {}

    /**
     * Get the instructions that the agent should follow.
     */
    public function instructions(): Stringable|string
    {
        $cases = implode(', ', array_map(fn (ThreadPriority $p) => $p->value, ThreadPriority::cases()));

        $lines = [];
        $lines[] = 'You triage support threads for urgency.';
        $lines[] = "Classify the urgency of the message below into exactly one of: {$cases}.";
        $lines[] = 'Use "urgent" only for things like outages, data loss, security issues, or a customer explicitly saying it is urgent/critical.';
        $lines[] = 'Use "high" for problems blocking the customer\'s work. Use "low" for minor questions or feedback. Otherwise use "normal".';

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
            'priority' => $schema->string()
                ->enum(array_map(fn (ThreadPriority $p) => $p->value, ThreadPriority::cases()))
                ->description('The urgency level of the thread.')
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
