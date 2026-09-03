import { Head, router } from '@inertiajs/react';
import { Check, Sparkles, Wand2, X } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';

const DESCRIPTION_LIMIT = 5000;

const EXAMPLE_DESCRIPTION =
    'We want responses to be warm and casual, using conversational language. Acknowledge how the customer feels before jumping into a solution, and keep things concise — no corporate jargon.';

/**
 * Reads the XSRF-TOKEN cookie that Laravel's EncryptCookies/VerifyCsrfToken
 * middleware sets on every response, mirroring what axios does automatically
 * for Inertia requests. Used here because the generate endpoint is a plain
 * JSON endpoint hit via fetch(), not an Inertia visit.
 */
function getXsrfToken(): string | null {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);

    return match ? decodeURIComponent(match[1]) : null;
}

export interface ToneRules {
    empathy?: string;
    language?: string;
    formality?: string;
    personality?: string;
    warmth?: string;
    [key: string]: string | undefined;
}

interface AiTonePageProps {
    toneRules: ToneRules;
}

const TONE_FIELDS: Array<{
    key: keyof ToneRules;
    title: string;
    description: string;
    placeholder: string;
}> = [
    {
        key: 'empathy',
        title: 'Empathy',
        description: 'How the AI Agent acknowledges customer frustration.',
        placeholder:
            "e.g. Always acknowledge the customer's frustration before offering a solution.",
    },
    {
        key: 'language',
        title: 'Language',
        description: 'Word choices and phrasing to prefer or avoid.',
        placeholder: 'e.g. Avoid jargon. Use plain, everyday language.',
    },
    {
        key: 'formality',
        title: 'Formality',
        description: 'How casual or formal replies should read.',
        placeholder: 'e.g. Friendly but professional, no slang.',
    },
    {
        key: 'personality',
        title: 'Personality',
        description: 'The character the AI Agent should project.',
        placeholder: 'e.g. Helpful, upbeat, and concise.',
    },
    {
        key: 'warmth',
        title: 'Warmth',
        description: 'How warm or neutral the tone should feel.',
        placeholder: "e.g. Warm and welcoming, use the customer's name.",
    },
];

export default function AiTonePage({ toneRules }: AiTonePageProps) {
    const [values, setValues] = React.useState<ToneRules>(toneRules ?? {});
    const [saving, setSaving] = React.useState<keyof ToneRules | null>(null);
    const [generating, setGenerating] = React.useState(false);
    const [generateError, setGenerateError] = React.useState<string | null>(
        null,
    );
    const [popoverOpen, setPopoverOpen] = React.useState(false);
    const [description, setDescription] = React.useState('');
    const [preSuggestionValues, setPreSuggestionValues] =
        React.useState<ToneRules | null>(null);
    const [applying, setApplying] = React.useState(false);

    const generate = async () => {
        setGenerating(true);
        setGenerateError(null);

        try {
            const response = await fetch('/ai/configuration/tone/generate', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getXsrfToken() ?? '',
                },
                body: JSON.stringify({ description: description.trim() }),
            });

            if (!response.ok) {
                throw new Error(`Request failed (${response.status})`);
            }

            const data: { tone_rules: ToneRules } = await response.json();

            setPreSuggestionValues(values);
            setValues((prev) => ({ ...prev, ...data.tone_rules }));
            setPopoverOpen(false);
        } catch {
            setGenerateError(
                'Something went wrong generating tone rules. Please try again.',
            );
        } finally {
            setGenerating(false);
        }
    };

    const discardSuggestions = () => {
        if (preSuggestionValues) {
            setValues(preSuggestionValues);
        }

        setPreSuggestionValues(null);
    };

    const applySuggestions = () => {
        setApplying(true);
        router.patch(
            '/ai/configuration/tone',
            { tone_rules: values },
            {
                preserveScroll: true,
                onFinish: () => {
                    setApplying(false);
                    setPreSuggestionValues(null);
                },
            },
        );
    };

    const save = (key: keyof ToneRules) => {
        setSaving(key);
        const next = { ...values };
        router.patch(
            '/ai/configuration/tone',
            { tone_rules: next },
            {
                preserveScroll: true,
                onFinish: () => {
                    setSaving(null);
                    setPreSuggestionValues(null);
                },
            },
        );
    };

    return (
        <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
            <Head title="Tone — AI Agent" />

            <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                    Define how the AI Agent should sound in its replies. Each
                    rule is injected into the system prompt when present.
                </p>
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0 gap-1.5"
                        >
                            <Sparkles className="size-3.5" />
                            Generate rules
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-96 space-y-3">
                        <div className="space-y-1">
                            <p className="text-sm font-semibold">
                                Describe your team&apos;s tone
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Tell us what you want AI to sound like to
                                customers – we&apos;ll turn your description
                                into clear tone rules.
                            </p>
                        </div>

                        <Textarea
                            value={description}
                            onChange={(e) =>
                                setDescription(
                                    e.target.value.slice(0, DESCRIPTION_LIMIT),
                                )
                            }
                            placeholder="We want responses to be warm and casual, using conversational language…"
                            className="min-h-28"
                            maxLength={DESCRIPTION_LIMIT}
                            autoFocus
                        />

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <button
                                type="button"
                                className="flex items-center gap-1 hover:text-foreground"
                                onClick={() =>
                                    setDescription(EXAMPLE_DESCRIPTION)
                                }
                            >
                                <Wand2 className="size-3" />
                                Show me an example
                            </button>
                            <span>
                                {description.length}/{DESCRIPTION_LIMIT}
                            </span>
                        </div>

                        {generateError && (
                            <p className="text-xs text-destructive">
                                {generateError}
                            </p>
                        )}

                        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                            <p className="text-[11px] text-muted-foreground">
                                You can edit each rule before it&apos;s applied.
                            </p>
                            <div className="flex shrink-0 gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={generating}
                                    onClick={() => setPopoverOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    disabled={generating}
                                    onClick={() => void generate()}
                                >
                                    {generating
                                        ? 'Generating…'
                                        : 'Generate rules'}
                                </Button>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {preSuggestionValues && (
                <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                    <p className="text-sm font-semibold">
                        Review suggested rules
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={applying}
                            onClick={discardSuggestions}
                            className="gap-1.5"
                        >
                            <X className="size-3.5" />
                            Discard all
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            disabled={applying}
                            onClick={applySuggestions}
                            className="gap-1.5"
                        >
                            <Check className="size-3.5" />
                            {applying ? 'Applying…' : 'Apply suggestions'}
                        </Button>
                    </div>
                </div>
            )}

            {TONE_FIELDS.map((field) => (
                <Card key={field.key}>
                    <CardHeader>
                        <CardTitle className="text-sm">{field.title}</CardTitle>
                        <CardDescription>{field.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Textarea
                            value={values[field.key] ?? ''}
                            onChange={(e) =>
                                setValues((prev) => ({
                                    ...prev,
                                    [field.key]: e.target.value,
                                }))
                            }
                            placeholder={field.placeholder}
                            className="min-h-24"
                        />
                        <div className="flex justify-end">
                            <Button
                                size="sm"
                                disabled={saving === field.key}
                                onClick={() => save(field.key)}
                            >
                                Save
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
