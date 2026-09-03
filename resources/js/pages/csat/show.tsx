import { Head, router } from '@inertiajs/react';
import { Star } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface CsatSurveyPageProps {
    survey: {
        token: string;
        rating: number | null;
        comment: string | null;
        responded: boolean;
    };
}

export default function CsatSurveyPage({ survey }: CsatSurveyPageProps) {
    const [rating, setRating] = React.useState(survey.rating ?? 0);
    const [hoverRating, setHoverRating] = React.useState(0);
    const [comment, setComment] = React.useState(survey.comment ?? '');
    const [submitted, setSubmitted] = React.useState(
        survey.responded && survey.comment !== null,
    );
    const [saving, setSaving] = React.useState(false);

    const handleSubmit = () => {
        if (rating < 1) {
            return;
        }

        setSaving(true);
        router.post(
            window.location.pathname,
            { rating, comment },
            {
                preserveScroll: true,
                onSuccess: () => setSubmitted(true),
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
            <Head title="How did we do?" />

            <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-background p-8 text-center shadow-sm">
                {submitted ? (
                    <>
                        <h1 className="text-lg font-semibold">
                            Thanks for your feedback!
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Your response has been recorded.
                        </p>
                    </>
                ) : (
                    <>
                        <div>
                            <h1 className="text-lg font-semibold">
                                How did we do?
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Let us know how we handled your conversation.
                            </p>
                        </div>

                        <div className="flex justify-center gap-1.5">
                            {Array.from({ length: 5 }).map((_, i) => {
                                const value = i + 1;
                                const filled = (hoverRating || rating) >= value;

                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setRating(value)}
                                        onMouseEnter={() =>
                                            setHoverRating(value)
                                        }
                                        onMouseLeave={() => setHoverRating(0)}
                                        aria-label={`Rate ${value} out of 5`}
                                        className="p-1"
                                    >
                                        <Star
                                            className={`size-8 transition-colors ${
                                                filled
                                                    ? 'fill-warning text-warning'
                                                    : 'text-muted-foreground'
                                            }`}
                                        />
                                    </button>
                                );
                            })}
                        </div>

                        <Textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Anything you'd like to add? (optional)"
                            maxLength={2000}
                            rows={3}
                        />

                        <Button
                            className="w-full"
                            disabled={rating < 1 || saving}
                            onClick={handleSubmit}
                        >
                            Submit
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}
