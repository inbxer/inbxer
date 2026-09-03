import { Head, Link, router } from '@inertiajs/react';
import {
    BookOpen,
    CheckCircle2,
    Circle,
    MessageSquareText,
    Sparkles,
    Workflow,
} from 'lucide-react';
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface OverviewChecklist {
    has_knowledge_sources: boolean;
    has_assignment_workflows: boolean;
    has_tone_rules: boolean;
}

interface HandoffBreakdown {
    sent: number;
    pending_review: number;
    edited: number;
    rejected: number;
}

interface KnowledgeHealth {
    connected: boolean;
    articles_count: number;
    indexed_count: number;
    pending_count: number;
    failed_count: number;
}

interface AiOverviewPageProps {
    mode: 'shadow' | 'live';
    checklist: OverviewChecklist;
    threadParticipationPercent: number | null;
    handoffBreakdown: HandoffBreakdown;
    knowledgeHealth: KnowledgeHealth;
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
    return (
        <div className="flex items-center gap-2 text-sm">
            {done ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
            ) : (
                <Circle className="size-4 text-muted-foreground" />
            )}
            <span className={done ? '' : 'text-muted-foreground'}>{label}</span>
        </div>
    );
}

export default function AiOverviewPage({
    mode,
    checklist,
    threadParticipationPercent,
    handoffBreakdown,
    knowledgeHealth,
}: AiOverviewPageProps) {
    const [goingLive, setGoingLive] = React.useState(false);
    const isLive = mode === 'live';

    const goLive = () => {
        setGoingLive(true);
        router.patch(
            '/ai/preferences',
            { mode: 'live' },
            { preserveScroll: true, onFinish: () => setGoingLive(false) },
        );
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
            <Head title="Overview — AI Agent" />

            <div
                className={`flex items-center justify-between gap-3 rounded-xl border p-4 ${
                    isLive
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-amber-500/30 bg-amber-500/5'
                }`}
            >
                <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
                        <Sparkles className="size-5 text-muted-foreground" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">
                                {isLive
                                    ? 'AI Agent is live'
                                    : 'AI Agent is in shadow mode'}
                            </p>
                            <Badge variant={isLive ? 'default' : 'secondary'}>
                                {isLive ? 'Live' : 'Shadow'}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {isLive
                                ? 'Replies are generated and sent to customers automatically.'
                                : 'Replies are generated and recorded in Activity, but not sent automatically.'}
                        </p>
                    </div>
                </div>
                {!isLive && (
                    <Button onClick={goLive} disabled={goingLive}>
                        Go live
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Setup checklist</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <ChecklistItem
                        done={checklist.has_knowledge_sources}
                        label="Connect a knowledge source"
                    />
                    <ChecklistItem
                        done={checklist.has_assignment_workflows}
                        label="Set up assignment workflows"
                    />
                    <ChecklistItem
                        done={checklist.has_tone_rules}
                        label="Define tone rules"
                    />
                </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">
                            Thread participation
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-semibold">
                            {threadParticipationPercent !== null
                                ? `${threadParticipationPercent}%`
                                : '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            of eligible threads replied to in the last 30 days
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">
                            Handoff breakdown
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                            <p className="font-semibold text-foreground">
                                {handoffBreakdown.sent}
                            </p>
                            <p className="text-muted-foreground">Sent</p>
                        </div>
                        <div>
                            <p className="font-semibold text-foreground">
                                {handoffBreakdown.pending_review}
                            </p>
                            <p className="text-muted-foreground">
                                Pending review
                            </p>
                        </div>
                        <div>
                            <p className="font-semibold text-foreground">
                                {handoffBreakdown.edited}
                            </p>
                            <p className="text-muted-foreground">Edited</p>
                        </div>
                        <div>
                            <p className="font-semibold text-foreground">
                                {handoffBreakdown.rejected}
                            </p>
                            <p className="text-muted-foreground">Handed off</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">
                        Knowledge sources health
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {!knowledgeHealth.connected ? (
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                                No Help Center connected yet.
                            </p>
                            <Link href="/ai/knowledge-sources">
                                <Button variant="outline" size="sm">
                                    <BookOpen data-icon="inline-start" />
                                    Connect
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                                <p className="font-semibold text-foreground">
                                    {knowledgeHealth.indexed_count}
                                </p>
                                <p className="text-muted-foreground">Indexed</p>
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">
                                    {knowledgeHealth.pending_count}
                                </p>
                                <p className="text-muted-foreground">Pending</p>
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">
                                    {knowledgeHealth.failed_count}
                                </p>
                                <p className="text-muted-foreground">Failed</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardContent className="flex items-center justify-between pt-6">
                    <div className="flex items-center gap-3">
                        <Workflow className="size-5 text-muted-foreground" />
                        <div>
                            <p className="text-sm font-semibold">
                                Route replies with a workflow
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Assignment is handled via the Workflow Engine.
                            </p>
                        </div>
                    </div>
                    <Link href="/workflows">
                        <Button variant="outline" size="sm">
                            <MessageSquareText data-icon="inline-start" />
                            Create a workflow
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}
