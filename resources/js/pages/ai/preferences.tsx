import { Head, Link, router } from '@inertiajs/react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

export interface AiSettings {
    mode: 'shadow' | 'live';
    public_name: string;
    send_handoff_message: boolean;
    include_inline_links: boolean;
    show_knowledge_citations: boolean;
    custom_instructions: string | null;
    avatar_url: string;
    has_custom_avatar: boolean;
}

export interface AssignmentWorkflow {
    id: string;
    name: string;
}

interface AiPreferencesPageProps {
    settings: AiSettings;
    assignmentWorkflows: AssignmentWorkflow[];
}

const CUSTOM_INSTRUCTIONS_LIMIT = 5000;

export default function AiPreferencesPage({
    settings,
    assignmentWorkflows,
}: AiPreferencesPageProps) {
    const [mode, setMode] = React.useState<'shadow' | 'live'>(settings.mode);
    const [publicName, setPublicName] = React.useState(settings.public_name);
    const [sendHandoffMessage, setSendHandoffMessage] = React.useState(
        settings.send_handoff_message,
    );
    const [includeInlineLinks, setIncludeInlineLinks] = React.useState(
        settings.include_inline_links,
    );
    const [showKnowledgeCitations, setShowKnowledgeCitations] = React.useState(
        settings.show_knowledge_citations,
    );
    const [customInstructions, setCustomInstructions] = React.useState(
        settings.custom_instructions ?? '',
    );
    const avatarUrl = settings.avatar_url;
    const hasCustomAvatar = settings.has_custom_avatar;
    const [saving, setSaving] = React.useState(false);
    const [avatarUploading, setAvatarUploading] = React.useState(false);
    const [avatarRemoving, setAvatarRemoving] = React.useState(false);
    const avatarInputRef = React.useRef<HTMLInputElement>(null);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (!file) {
            return;
        }

        setAvatarUploading(true);
        router.post(
            '/ai/preferences/avatar',
            { avatar: file },
            {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => setAvatarUploading(false),
            },
        );
    };

    const removeAvatar = () => {
        setAvatarRemoving(true);
        router.delete('/ai/preferences/avatar', {
            preserveScroll: true,
            onFinish: () => setAvatarRemoving(false),
        });
    };

    const save = () => {
        setSaving(true);
        router.patch(
            '/ai/preferences',
            {
                mode,
                public_name: publicName,
                send_handoff_message: sendHandoffMessage,
                include_inline_links: includeInlineLinks,
                show_knowledge_citations: showKnowledgeCitations,
                custom_instructions: customInstructions,
            },
            { preserveScroll: true, onFinish: () => setSaving(false) },
        );
    };

    return (
        <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
            <Head title="Preferences — AI Agent" />

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Appearance</CardTitle>
                    <CardDescription>
                        How the AI Agent identifies itself to customers.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                            Avatar
                        </label>
                        <div className="flex items-center gap-3">
                            <Avatar className="size-12 rounded-lg">
                                <AvatarImage src={avatarUrl} />
                                <AvatarFallback className="rounded-lg">
                                    <Sparkles className="size-5 text-muted-foreground" />
                                </AvatarFallback>
                            </Avatar>
                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/jpeg,image/png"
                                className="hidden"
                                onChange={handleAvatarChange}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={avatarUploading}
                                onClick={() => avatarInputRef.current?.click()}
                            >
                                {avatarUploading
                                    ? 'Uploading…'
                                    : 'Upload image'}
                            </Button>
                            {hasCustomAvatar && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={avatarRemoving}
                                    onClick={removeAvatar}
                                >
                                    {avatarRemoving ? 'Removing…' : 'Remove'}
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                            Public name
                        </label>
                        <Input
                            value={publicName}
                            onChange={(e) => setPublicName(e.target.value)}
                            placeholder="Inbi"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Mode</CardTitle>
                    <CardDescription>
                        Choose whether the AI Agent sends replies automatically
                        or waits for review.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => setMode('shadow')}
                        className={`relative rounded-lg border p-4 text-left transition-colors ${
                            mode === 'shadow'
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:bg-muted/40'
                        }`}
                    >
                        {mode === 'shadow' && (
                            <CheckCircle2 className="absolute top-3 right-3 size-4 text-primary" />
                        )}
                        <p className="text-sm font-semibold">Shadow</p>
                        <p className="text-xs text-muted-foreground">
                            Records what it would have replied in Activity.
                            Requires manual approval before sending.
                        </p>
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('live')}
                        className={`relative rounded-lg border p-4 text-left transition-colors ${
                            mode === 'live'
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:bg-muted/40'
                        }`}
                    >
                        {mode === 'live' && (
                            <CheckCircle2 className="absolute top-3 right-3 size-4 text-primary" />
                        )}
                        <p className="text-sm font-semibold">Live</p>
                        <p className="text-xs text-muted-foreground">
                            Sends the generated reply to the customer
                            automatically.
                        </p>
                    </button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Assignment</CardTitle>
                    <CardDescription>
                        Assignment of AI-eligible threads is handled by the
                        Workflow Engine.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {assignmentWorkflows.length > 0 ? (
                        <div className="space-y-1">
                            {assignmentWorkflows.map((workflow) => (
                                <p
                                    key={workflow.id}
                                    className="text-xs text-muted-foreground"
                                >
                                    Assigned via:{' '}
                                    <span className="font-medium text-foreground">
                                        {workflow.name}
                                    </span>
                                </p>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            No workflow currently hands threads to the AI Agent.
                        </p>
                    )}
                    <Link href="/workflows">
                        <Button variant="outline" size="sm">
                            Manage workflows
                        </Button>
                    </Link>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Behavior</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium">
                                Send handoff message
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Let the customer know a human agent will follow
                                up when the AI isn't confident.
                            </p>
                        </div>
                        <Switch
                            checked={sendHandoffMessage}
                            onCheckedChange={setSendHandoffMessage}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium">
                                Include inline links
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Link out to referenced Help Center articles
                                inside the reply.
                            </p>
                        </div>
                        <Switch
                            checked={includeInlineLinks}
                            onCheckedChange={setIncludeInlineLinks}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium">
                                Show knowledge citations
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Cite the source article for each piece of
                                information.
                            </p>
                        </div>
                        <Switch
                            checked={showKnowledgeCitations}
                            onCheckedChange={setShowKnowledgeCitations}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">
                        Custom instructions
                    </CardTitle>
                    <CardDescription>
                        Extra guidance injected into every reply the AI Agent
                        generates.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1.5">
                    <Textarea
                        value={customInstructions}
                        onChange={(e) =>
                            setCustomInstructions(
                                e.target.value.slice(
                                    0,
                                    CUSTOM_INSTRUCTIONS_LIMIT,
                                ),
                            )
                        }
                        className="min-h-32"
                        maxLength={CUSTOM_INSTRUCTIONS_LIMIT}
                    />
                    <p className="text-right text-[11px] text-muted-foreground">
                        {customInstructions.length}/{CUSTOM_INSTRUCTIONS_LIMIT}
                    </p>
                </CardContent>
            </Card>

            <Button disabled={saving} onClick={save}>
                Save changes
            </Button>
        </div>
    );
}
