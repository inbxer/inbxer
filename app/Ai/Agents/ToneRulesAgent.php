<?php

namespace App\Ai\Agents;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Promptable;
use Stringable;

/**
 * Generates a suggested tone-of-voice profile (empathy, language, formality,
 * personality, warmth) for a team's AI support agent, used to pre-fill the
 * Tone settings page's "Generate rules" action. The team can still edit and
 * save the suggested values manually, same as hand-written tone rules.
 */
class ToneRulesAgent implements Agent, HasStructuredOutput
{
    use Promptable;

    public function __construct(
        private readonly string $teamName,
        private readonly ?string $customInstructions = null,
        private readonly string $model = 'gemini-3.5-flash-lite',
        private readonly float $temperature = 0.7,
    ) {}

    /**
     * Get the instructions that the agent should follow.
     */
    public function instructions(): Stringable|string
    {
        $lines = [];

        $lines[] = "You are helping {$this->teamName} define a tone-of-voice profile for their customer support AI agent.";
        $lines[] = 'Suggest sensible values for five tone dimensions: empathy, language, formality, personality, and warmth.';
        $lines[] = 'Each value should be a short, concrete instruction (1-2 sentences) aimed at guiding how an AI writes support replies, written for a support-agent audience — e.g. "Acknowledge frustration before offering solutions."';

        if (filled($this->customInstructions)) {
            $lines[] = "Use the team's existing instructions as context for the tone that would fit them: {$this->customInstructions}";
        } else {
            $lines[] = 'No team-specific instructions were provided, so infer a reasonable default: professional but friendly, clear, and warm without being overly casual.';
        }

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
            'empathy' => $schema->string()->description('How the AI should acknowledge customer frustration or emotion.')->required(),
            'language' => $schema->string()->description('Word choices and phrasing the AI should prefer or avoid.')->required(),
            'formality' => $schema->string()->description('How casual or formal replies should read.')->required(),
            'personality' => $schema->string()->description('The character the AI should project.')->required(),
            'warmth' => $schema->string()->description('How warm or neutral the tone should feel.')->required(),
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
