<?php

namespace App\Ai\Agents;

use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Promptable;
use Stringable;

/**
 * Generates a short "catch me up" summary of a thread's timeline so an
 * agent can quickly understand where the conversation stands. Plain-text
 * output, same convention as SupportReplyAgent.
 */
class ThreadSummaryAgent implements Agent
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
            'You summarize customer support conversations for an agent who is about to pick them up.',
            'You will be given the conversation timeline (customer messages and agent replies, in order).',
            'Write a short summary (2-4 sentences) covering: what the customer wants, what has been tried/said so far, and what (if anything) is still outstanding.',
            'Respond with ONLY the summary text — no headings, no bullet points, no preamble.',
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
