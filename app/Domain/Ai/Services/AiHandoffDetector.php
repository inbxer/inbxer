<?php

namespace App\Domain\Ai\Services;

/**
 * Decides whether a conversation should be handed off to a human agent
 * instead of the AI replying — either because the customer explicitly asked
 * for a human, or because the AI's own generated reply expresses
 * uncertainty. Keyword-based on purpose (MVP): cheap, fast, no extra LLM
 * call, and honest about being a heuristic rather than true intent
 * detection.
 */
class AiHandoffDetector
{
    /**
     * Phrases (English + Arabic) that signal the customer is explicitly
     * asking to talk to a human / customer service rather than a bot.
     */
    private const EXPLICIT_REQUEST_NEEDLES = [
        // English
        'talk to a human', 'speak to a human', 'human agent', 'real person',
        'customer service', 'customer support', 'speak to someone',
        'talk to someone', 'connect me to', 'representative',
        // Arabic
        'خدمة العملاء', 'دعم العملاء', 'أتكلم مع حد', 'اتكلم مع حد',
        'موظف بشري', 'شخص حقيقي', 'حولني', 'كلمني مع حد', 'عايز اتكلم مع',
    ];

    /**
     * Phrases in the AI's own generated reply that signal it wasn't
     * confident in the answer.
     */
    private const UNCERTAIN_REPLY_NEEDLES = [
        "i'm not sure", 'i am not sure', "i don't know", 'i do not know',
        'unable to find', 'not confident',
    ];

    /**
     * Whether the customer's message itself is an explicit request for a
     * human, checked before the AI even attempts to generate a reply.
     */
    public function customerRequestsHuman(string $customerMessage): bool
    {
        return $this->containsAny($customerMessage, self::EXPLICIT_REQUEST_NEEDLES);
    }

    /**
     * Whether the AI's generated reply reads as uncertain, checked after
     * generation as a secondary signal.
     */
    public function replyLooksUncertain(string $generatedReply): bool
    {
        return $this->containsAny($generatedReply, self::UNCERTAIN_REPLY_NEEDLES);
    }

    /**
     * @param  array<int, string>  $needles
     */
    private function containsAny(string $haystack, array $needles): bool
    {
        $haystack = mb_strtolower($haystack);

        foreach ($needles as $needle) {
            if (str_contains($haystack, mb_strtolower($needle))) {
                return true;
            }
        }

        return false;
    }
}
