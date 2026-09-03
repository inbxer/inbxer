import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { ModeSwitcherRail } from '@/components/mode-switcher-rail';
import { PlatformHeader } from '@/components/platform-header';
import { PlatformSidebar } from '@/components/platform-sidebar';

// Mirrors the settings groups in resources/js/components/platform-sidebar.tsx —
// used to show the current page's real title instead of a static "Settings".
const PAGE_TITLES: Record<string, string> = {
    'settings/overview': 'Settings',
    'settings/profile': 'Profile',
    'settings/security': 'Security',
    'settings/appearance': 'Appearance',
    'settings/general': 'General',
    'settings/members': 'Members',
    'settings/roles': 'Roles',
    'settings/channels': 'Channels',
    'settings/chat-channel-list': 'Chat channels',
    'settings/chat-channel': 'Chat channel',
    'settings/email-channel': 'Email channel',
    'settings/slack-channel': 'Slack channel',
    'settings/slack-workspace-detail': 'Slack workspace',
    'settings/labels': 'Labels',
    'settings/tiers': 'Tiers & SLAs',
    'settings/groups': 'Customer Groups',
    'settings/workflow-behavior': 'Workflow',
    'settings/snippets': 'Snippets',
    'settings/business-hours': 'Business hours',
    'settings/auto-responses': 'Auto-responses',
    'settings/auto-response-edit': 'Auto-response',
    'settings/csat': 'CSAT',
    'settings/spam': 'Spam filtering',
    'settings/integrations/mintlify': 'Help Center',
    'settings/api-keys': 'API Keys',
    'settings/webhooks': 'Webhooks',
};

export default function SettingsLayout({ children }: { children: ReactNode }) {
    const { component } = usePage();
    const title = PAGE_TITLES[component] ?? 'Settings';

    return (
        <AppShell variant="sidebar">
            <ModeSwitcherRail mode="settings" />
            <PlatformSidebar mode="settings" />
            <AppContent variant="sidebar" className="min-w-0 overflow-hidden">
                <PlatformHeader
                    eyebrow="Workspace administration"
                    title={title}
                />
                <main className="min-h-0 flex-1 overflow-auto">{children}</main>
            </AppContent>
        </AppShell>
    );
}
