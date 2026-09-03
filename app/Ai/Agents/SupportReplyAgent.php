<?php

namespace App\Ai\Agents;

use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Promptable;
use Stringable;

/**
 * Generates a customer support reply for a thread, using per-team runtime
 * configuration (model/temperature/instructions) supplied at construction
 * time by AiReplyGenerator — the provider/model methods below take priority
 * over any class attributes per laravel/ai's resolution order (see
 * Laravel\Ai\Promptable::getProvidersAndModels()).
 */
class SupportReplyAgent implements Agent
{
    use Promptable;

    public function __construct(
        private readonly string $instructions,
        private readonly string $model = 'gemini-3.5-flash-lite',
        private readonly float $temperature = 0.3,
    ) {}

    /**
     * Get the instructions that the agent should follow.
     */
    public function instructions(): Stringable|string
    {
        return $this->instructions;
    }

    /**
     * The AI provider to prompt against.
     */
    public function provider(): string
    {
        return 'gemini';
    }

    /**
     * The model to use, sourced from the team's AI settings.
     */
    public function model(): string
    {
        return $this->model;
    }

    /**
     * The sampling temperature to use, sourced from the team's AI settings.
     */
    public function temperature(): float
    {
        return $this->temperature;
    }
}
