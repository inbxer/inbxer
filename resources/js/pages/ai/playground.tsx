import { useChat } from '@ai-sdk/react';
import { Head } from '@inertiajs/react';
import { DefaultChatTransport } from 'ai';
import { Bot, Send, User } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

/**
 * Reads the XSRF-TOKEN cookie that Laravel's EncryptCookies/VerifyCsrfToken
 * middleware sets on every response, mirroring what axios does automatically
 * for Inertia requests. Used here because /ai/playground/stream is a plain
 * streaming endpoint hit directly by the AI SDK transport, not an Inertia
 * visit.
 */
function getXsrfToken(): string | null {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);

    return match ? decodeURIComponent(match[1]) : null;
}

export default function AiPlaygroundPage() {
    const [input, setInput] = React.useState('');

    const transport = React.useMemo(
        () =>
            new DefaultChatTransport({
                api: '/ai/playground/stream',
                credentials: 'same-origin',
                headers: () => ({
                    'X-XSRF-TOKEN': getXsrfToken() ?? '',
                }),
            }),
        [],
    );

    const { messages, sendMessage, status, error } = useChat({ transport });

    const busy = status === 'submitted' || status === 'streaming';

    const send = () => {
        const text = input.trim();

        if (!text || busy) {
            return;
        }

        setInput('');
        void sendMessage({ text });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    return (
        <div className="mx-auto flex h-full max-w-2xl flex-col p-4 sm:p-6">
            <Head title="Playground — AI Agent" />

            <div className="mb-4">
                <h1 className="text-lg font-semibold">Playground</h1>
                <p className="text-xs text-muted-foreground">
                    Test how the AI Agent would respond to a customer message,
                    streamed live. Nothing here is saved or sent to a real
                    customer.
                </p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto rounded-lg border border-border p-4">
                {messages.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                        Send a message below to see how the AI Agent would
                        reply.
                    </p>
                ) : (
                    messages.map((message) => {
                        const text = message.parts
                            .filter((part) => part.type === 'text')
                            .map((part) => part.text)
                            .join('');

                        return (
                            <div
                                key={message.id}
                                className={`flex gap-2 ${
                                    message.role === 'user'
                                        ? 'flex-row-reverse'
                                        : ''
                                }`}
                            >
                                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                                    {message.role === 'user' ? (
                                        <User className="size-3.5" />
                                    ) : (
                                        <Bot className="size-3.5" />
                                    )}
                                </div>
                                <div
                                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                                        message.role === 'user'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted'
                                    }`}
                                >
                                    <p className="whitespace-pre-wrap">
                                        {text}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                {status === 'submitted' && (
                    <p className="text-xs text-muted-foreground">
                        Generating reply…
                    </p>
                )}
            </div>

            {error && (
                <p className="mt-2 text-xs text-destructive">
                    Something went wrong generating a test reply. Please try
                    again.
                </p>
            )}

            <div className="mt-3 flex items-end gap-2">
                <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a customer message to test…"
                    className="min-h-16"
                />
                <Button onClick={send} disabled={busy || !input.trim()}>
                    <Send data-icon="inline-start" />
                    Send
                </Button>
            </div>
        </div>
    );
}
