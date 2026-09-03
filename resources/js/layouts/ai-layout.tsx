import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { ModeSwitcherRail } from '@/components/mode-switcher-rail';
import { PlatformHeader } from '@/components/platform-header';
import { PlatformSidebar } from '@/components/platform-sidebar';

// Mirrors the AI groups in resources/js/components/platform-sidebar.tsx —
// used to show the current page's real title instead of a static "AI Agent".
const PAGE_TITLES: Record<string, string> = {
    'ai/overview': 'Overview',
    'ai/activity': 'Activity',
    'ai/preferences': 'Preferences',
    'ai/playground': 'Playground',
    'ai/knowledge-sources': 'Knowledge Sources',
    'ai/automations': 'Automations',
    'ai/configuration/tone': 'Tone',
    'ai/suggested-responses': 'Suggested responses',
};

export default function AiLayout({ children }: { children: ReactNode }) {
    const { component } = usePage();
    const title = PAGE_TITLES[component] ?? 'AI Agent';

    return (
        <AppShell variant="sidebar">
            <ModeSwitcherRail mode="ai" />
            <PlatformSidebar mode="ai" />
            <AppContent variant="sidebar" className="min-w-0 overflow-hidden">
                <PlatformHeader eyebrow="AI Agent" title={title} />
                <main className="min-h-0 flex-1 overflow-auto">{children}</main>
            </AppContent>
        </AppShell>
    );
}
