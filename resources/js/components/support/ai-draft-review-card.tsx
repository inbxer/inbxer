import { router } from '@inertiajs/react';
import { Check, Sparkles, X } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useConfirm } from '@/hooks/use-confirm';

export interface PendingAiDraft {
    id: string;
    generated_reply: string;
    matched_articles: Array<{ id: string; title: string; url: string }>;
    created_at: string;
}

interface AiDraftReviewCardProps {
    draft: PendingAiDraft;
}

/**
 * Shows the AI's pending Shadow-mode draft reply inline in the thread view
 * so an agent can approve (optionally editing first) or reject it right
 * where they're already working, instead of having to visit /ai/activity.
 */
export function AiDraftReviewCard({ draft }: AiDraftReviewCardProps) {
    const confirm = useConfirm();
    const [editing, setEditing] = React.useState(false);
    const [body, setBody] = React.useState(draft.generated_reply);
    const [busy, setBusy] = React.useState(false);
    const [dismissed, setDismissed] = React.useState(false);

    const approve = () => {
        setBusy(true);
        setDismissed(true);
        router.post(
            `/ai/activity/${draft.id}/approve`,
            editing ? { generated_reply: body } : {},
            {
                preserveScroll: true,
                onFinish: () => setBusy(false),
                onError: () => setDismissed(false),
            },
        );
    };

    const reject = async () => {
        if (
            !(await confirm({
                title: 'Reject this AI draft?',
                description:
                    'The draft will be discarded and nothing will be sent to the customer.',
                confirmText: 'Reject',
                variant: 'destructive',
            }))
        ) {
            return;
        }

        setBusy(true);
        setDismissed(true);
        router.post(
            `/ai/activity/${draft.id}/reject`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setBusy(false),
                onError: () => setDismissed(false),
            },
        );
    };

    if (dismissed) {
        return null;
    }

    return (
        <div className="mx-4 mb-2 space-y-2 rounded-xl border border-violet-500/30 bg-violet-500/5 p-3.5">
            <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full">
                    <img
                        src="/widget/ai-avatar.jpg"
                        alt="Inbi"
                        className="h-full w-full object-cover"
                    />
                </div>
                <span className="text-xs font-bold text-foreground">Inbi</span>
                <span className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-violet-500 uppercase">
                    <Sparkles className="size-3" />
                    Draft — pending review
                </span>
            </div>

            {editing ? (
                <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="min-h-24 bg-background text-sm"
                    autoFocus
                />
            ) : (
                <p className="text-sm whitespace-pre-wrap text-foreground">
                    {body}
                </p>
            )}

            {draft.matched_articles.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {draft.matched_articles.map((article) => (
                        <a
                            key={article.id}
                            href={article.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                        >
                            {article.title}
                        </a>
                    ))}
                </div>
            )}

            <div className="flex items-center gap-2 pt-1">
                <Button
                    size="sm"
                    disabled={busy}
                    onClick={approve}
                    className="gap-1.5"
                >
                    <Check className="size-3.5" />
                    {editing ? 'Save & approve' : 'Approve'}
                </Button>
                {!editing && (
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => setEditing(true)}
                    >
                        Edit
                    </Button>
                )}
                <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void reject()}
                    className="gap-1.5 text-destructive hover:text-destructive"
                >
                    <X className="size-3.5" />
                    Reject
                </Button>
            </div>
        </div>
    );
}
