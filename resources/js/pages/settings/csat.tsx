import { Head, router } from '@inertiajs/react';
import { Star } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface CsatSettings {
    enabled: boolean;
    message: string;
    delay_minutes: number;
}

interface RecentResponse {
    id: string;
    tenant_name: string | null;
    rating: number | null;
    comment: string | null;
    responded_at: string | null;
}

interface CsatSettingsPageProps {
    settings: CsatSettings;
    stats: {
        total_responded: number;
        positive_percentage: number | null;
    };
    recentResponses: RecentResponse[];
}

export default function CsatSettingsPage({
    settings,
    stats,
    recentResponses,
}: CsatSettingsPageProps) {
    const [enabled, setEnabled] = React.useState(settings.enabled);
    const [message, setMessage] = React.useState(settings.message);
    const [delayMinutes, setDelayMinutes] = React.useState(
        settings.delay_minutes,
    );
    const [saving, setSaving] = React.useState(false);

    const handleSave = () => {
        setSaving(true);
        router.patch(
            window.location.pathname,
            { enabled, message, delay_minutes: delayMinutes },
            { preserveScroll: true, onFinish: () => setSaving(false) },
        );
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
            <Head title="CSAT" />

            <div>
                <h1 className="text-xl font-semibold">Customer satisfaction</h1>
                <p className="text-sm text-muted-foreground">
                    Send a short survey to customers after their conversation is
                    marked done, and track how happy they are with your support.
                </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                    <p className="text-sm font-semibold">Enable CSAT surveys</p>
                    <p className="text-xs text-muted-foreground">
                        Automatically email a satisfaction survey when a thread
                        is marked done.
                    </p>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                    Survey message
                </label>
                <p className="text-[11px] text-muted-foreground">
                    Shown to the customer above the star rating.
                </p>
                <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={500}
                    rows={3}
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                    Delay before sending
                </label>
                <p className="text-[11px] text-muted-foreground">
                    Minutes to wait after the thread is marked done before the
                    survey is sent.
                </p>
                <Input
                    type="number"
                    min={0}
                    max={10080}
                    value={delayMinutes}
                    onChange={(e) => setDelayMinutes(Number(e.target.value))}
                    className="w-32"
                />
            </div>

            <Button disabled={saving} onClick={handleSave}>
                Save
            </Button>

            <div className="space-y-3 border-t border-border pt-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Recent responses</h2>
                    {stats.total_responded > 0 && (
                        <p className="text-xs text-muted-foreground">
                            {stats.positive_percentage}% positive ·{' '}
                            {stats.total_responded} response
                            {stats.total_responded === 1 ? '' : 's'}
                        </p>
                    )}
                </div>

                {recentResponses.length === 0 ? (
                    <Empty className="border">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Star />
                            </EmptyMedia>
                            <EmptyTitle>No responses yet</EmptyTitle>
                            <EmptyDescription>
                                Survey responses will show up here once
                                customers start rating their conversations.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                        {recentResponses.map((r) => (
                            <div key={r.id} className="space-y-1 px-3 py-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold">
                                        {r.tenant_name ?? 'Unknown customer'}
                                    </span>
                                    <div className="flex items-center gap-0.5">
                                        {Array.from({ length: 5 }).map(
                                            (_, i) => (
                                                <Star
                                                    key={i}
                                                    className={`size-3.5 ${
                                                        (r.rating ?? 0) > i
                                                            ? 'fill-warning text-warning'
                                                            : 'text-muted-foreground'
                                                    }`}
                                                />
                                            ),
                                        )}
                                    </div>
                                </div>
                                {r.comment && (
                                    <p className="text-xs text-muted-foreground">
                                        {r.comment}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
