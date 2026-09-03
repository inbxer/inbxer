import { Head, router } from '@inertiajs/react';
import { Copy, Paperclip, Plus, Trash2 } from 'lucide-react';
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface GeneralSettingsPageProps {
    team: {
        id: number;
        slug: string;
        name: string;
        internal_name: string | null;
        logo_url: string | null;
        domains: string[];
    };
}

export default function GeneralSettingsPage({
    team,
}: GeneralSettingsPageProps) {
    const [name, setName] = React.useState(team.name);
    const [internalName, setInternalName] = React.useState(
        team.internal_name ?? '',
    );
    const [domains, setDomains] = React.useState<string[]>(team.domains);
    const [newDomain, setNewDomain] = React.useState('');
    const [saving, setSaving] = React.useState(false);
    const [uploading, setUploading] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const addDomain = () => {
        const value = newDomain.trim().toLowerCase();

        if (!value || domains.includes(value)) {
            return;
        }

        setDomains((prev) => [...prev, value]);
        setNewDomain('');
    };

    const removeDomain = (domain: string) => {
        setDomains((prev) => prev.filter((d) => d !== domain));
    };

    const handleSave = () => {
        setSaving(true);
        router.patch(
            window.location.pathname,
            { name, internal_name: internalName, domains },
            { preserveScroll: true, onFinish: () => setSaving(false) },
        );
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (!file) {
            return;
        }

        setUploading(true);
        router.post(
            `${window.location.pathname}/logo`,
            { logo: file },
            {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => setUploading(false),
            },
        );
    };

    const copyWorkspaceId = () => {
        navigator.clipboard.writeText(team.slug);
    };

    return (
        <div className="mx-auto max-w-2xl space-y-8 p-4 sm:p-6">
            <Head title="General — Workspace Settings" />

            <div>
                <h1 className="text-xl font-semibold">General</h1>
                <p className="text-sm text-muted-foreground">
                    Configure workspace name, logo, and domain settings
                </p>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold">Logo</label>
                <p className="text-xs text-muted-foreground">
                    This logo appears in outbound messages to your customers.
                    Recommended size: 240×240px. Accepted formats: JPEG and PNG,
                    up to 10MB.
                </p>
                <div className="flex items-center gap-3">
                    <Avatar className="size-12 rounded-lg">
                        <AvatarImage src={team.logo_url ?? undefined} />
                        <AvatarFallback className="rounded-lg">
                            {team.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png"
                        className="hidden"
                        onChange={handleLogoChange}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Paperclip data-icon="inline-start" />
                        {uploading ? 'Uploading…' : 'Upload logo'}
                    </Button>
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-sm font-semibold">Workspace ID</label>
                <p className="text-xs text-muted-foreground">
                    We may ask for this if you contact us for support.
                </p>
                <div className="flex items-center justify-between rounded-md border border-input bg-muted px-3 py-2 text-sm">
                    <span className="font-mono">{team.slug}</span>
                    <button
                        type="button"
                        onClick={copyWorkspaceId}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <Copy className="size-3.5" />
                    </button>
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-sm font-semibold">Public name</label>
                <p className="text-xs text-muted-foreground">
                    Used in customer-facing communications, and visible to your
                    customers. Usually your company name.
                </p>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-1.5">
                <label className="text-sm font-semibold">Internal name</label>
                <p className="text-xs text-muted-foreground">
                    Used to help your team identify this workspace. Not visible
                    to customers.
                </p>
                <Input
                    value={internalName}
                    onChange={(e) => setInternalName(e.target.value)}
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-sm font-semibold">Domain names</label>
                <p className="text-xs text-muted-foreground">
                    Used to identify team members who aren&apos;t members of
                    this workspace, but interact with customers.
                </p>
                <div className="flex gap-2">
                    <Input
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addDomain();
                            }
                        }}
                        placeholder="e.g. acme.com"
                    />
                    <Button type="button" variant="outline" onClick={addDomain}>
                        <Plus data-icon="inline-start" />
                        Add
                    </Button>
                </div>
                {domains.length > 0 && (
                    <div className="divide-y divide-border rounded-md border border-input">
                        {domains.map((domain) => (
                            <div
                                key={domain}
                                className="flex items-center justify-between px-3 py-2 text-sm"
                            >
                                {domain}
                                <button
                                    type="button"
                                    onClick={() => removeDomain(domain)}
                                    className="text-muted-foreground hover:text-destructive"
                                >
                                    <Trash2 className="size-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Button disabled={saving} onClick={handleSave}>
                Save
            </Button>
        </div>
    );
}
