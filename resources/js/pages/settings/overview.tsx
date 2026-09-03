import { Head, Link } from '@inertiajs/react';
import {
    BookOpen,
    CircleUserRound,
    Clock,
    FileText,
    KeyRound,
    Layers3,
    MessageCircle,
    Palette,
    Reply,
    ShieldAlert,
    ShieldCheck,
    SlidersHorizontal,
    Star,
    Tags,
    UsersRound,
    Users2,
    Webhook as WebhookIcon,
    Workflow,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface SettingsCard {
    title: string;
    description: string;
    href: string;
    icon: LucideIcon;
}

interface SettingsSection {
    label: string;
    cards: SettingsCard[];
}

// Mirrors the settings groups in resources/js/components/platform-sidebar.tsx —
// this is the "landing page" view of the same information architecture.
function buildSections(base: string): SettingsSection[] {
    return [
        {
            label: 'Account',
            cards: [
                {
                    title: 'Profile',
                    description: 'Your name, email, and account details.',
                    href: '/settings/profile',
                    icon: CircleUserRound,
                },
                {
                    title: 'Security',
                    description: 'Password and two-factor authentication.',
                    href: '/settings/security',
                    icon: ShieldCheck,
                },
                {
                    title: 'Appearance',
                    description: 'Theme and display preferences.',
                    href: '/settings/appearance',
                    icon: Palette,
                },
            ],
        },
        {
            label: 'Workspace',
            cards: [
                {
                    title: 'General',
                    description: 'Workspace name, logo, and domains.',
                    href: `${base}/settings/general`,
                    icon: SlidersHorizontal,
                },
                {
                    title: 'Members',
                    description: 'Invite and manage teammates.',
                    href: `${base}/settings/members`,
                    icon: UsersRound,
                },
                {
                    title: 'Roles',
                    description: 'Permissions for each team role.',
                    href: `${base}/settings/roles`,
                    icon: ShieldCheck,
                },
                {
                    title: 'Channels',
                    description: 'Email, Slack, and chat widget setup.',
                    href: `${base}/settings/channels`,
                    icon: MessageCircle,
                },
                {
                    title: 'Labels',
                    description: 'Organize threads with labels.',
                    href: `${base}/settings/labels`,
                    icon: Tags,
                },
                {
                    title: 'Tiers & SLAs',
                    description: 'Support tiers and response-time targets.',
                    href: `${base}/settings/tiers`,
                    icon: Layers3,
                },
                {
                    title: 'Customer Groups',
                    description: 'Group customers for targeting and reporting.',
                    href: `${base}/settings/groups`,
                    icon: Users2,
                },
            ],
        },
        {
            label: 'Workflow',
            cards: [
                {
                    title: 'Workflow',
                    description: 'Assignment, away mode, and status rules.',
                    href: `${base}/settings/workflow`,
                    icon: Workflow,
                },
                {
                    title: 'Snippets',
                    description: 'Reusable reply templates.',
                    href: `${base}/settings/snippets`,
                    icon: FileText,
                },
                {
                    title: 'Business hours',
                    description: 'When your team is available.',
                    href: `${base}/settings/business-hours`,
                    icon: Clock,
                },
                {
                    title: 'Auto-responses',
                    description: 'Automatic replies to inbound messages.',
                    href: `${base}/settings/autoresponses`,
                    icon: Reply,
                },
                {
                    title: 'CSAT',
                    description: 'Customer satisfaction surveys.',
                    href: `${base}/settings/csat`,
                    icon: Star,
                },
                {
                    title: 'Spam filtering',
                    description: 'Block unwanted inbound conversations.',
                    href: `${base}/settings/spam`,
                    icon: ShieldAlert,
                },
            ],
        },
        {
            label: 'Integrations',
            cards: [
                {
                    title: 'Help Center',
                    description: 'Connect your Mintlify documentation site.',
                    href: `${base}/settings/integrations/mintlify`,
                    icon: BookOpen,
                },
            ],
        },
        {
            label: 'Developers',
            cards: [
                {
                    title: 'API Keys',
                    description: 'Machine users for programmatic access.',
                    href: `${base}/settings/api-keys`,
                    icon: KeyRound,
                },
                {
                    title: 'Webhooks',
                    description: 'Real-time HTTP event notifications.',
                    href: `${base}/settings/webhooks`,
                    icon: WebhookIcon,
                },
            ],
        },
    ];
}

export default function SettingsOverviewPage() {
    const base = '';
    const sections = buildSections(base);

    return (
        <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-6">
            <Head title="Settings" />

            <div>
                <h1 className="text-xl font-semibold">Settings</h1>
                <p className="text-sm text-muted-foreground">
                    Manage your account and workspace configuration.
                </p>
            </div>

            {sections.map((section) => (
                <div key={section.label} className="space-y-3">
                    <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        {section.label}
                    </h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {section.cards.map((card) => (
                            <Link
                                key={card.href}
                                href={card.href}
                                className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"
                            >
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                                    <card.icon className="size-4 text-muted-foreground" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium">
                                        {card.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {card.description}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
