<?php

namespace App\Ai\Agents;

use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Promptable;
use Stringable;

/**
 * Generates a short, descriptive title for a thread from its first customer
 * message. Plain-text output (no structured schema needed), same convention
 * as SupportReplyAgent.
 */
class ThreadTitleAgent implements Agent
{
    use Promptable;

    public function __construct(
        private readonly string $model = 'gemini-3.5-flash-lite',
        private readonly float $temperature = 0.3,
    ) {}

    /**
     * Get the instructions that the agent should follow.
     */
    public function instructions(): Stringable|string
    {
        return implode("\n", [
            'You write short, descriptive titles for customer support threads, based on the customer\'s first message.',
            'Respond with ONLY the title text — no quotes, no punctuation at the end, no explanation.',
            'Keep it to 60 characters or fewer, plain and specific to what the customer is asking about.',
        ]);
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
