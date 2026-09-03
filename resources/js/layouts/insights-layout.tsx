import type { ReactNode } from 'react';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { ModeSwitcherRail } from '@/components/mode-switcher-rail';
import { PlatformHeader } from '@/components/platform-header';
import { PlatformSidebar } from '@/components/platform-sidebar';

export default function InsightsLayout({ children }: { children: ReactNode }) {
    return (
        <AppShell variant="sidebar">
            <ModeSwitcherRail mode="insights" />
            <PlatformSidebar mode="insights" />
            <AppContent variant="sidebar" className="min-w-0 overflow-hidden">
                <PlatformHeader eyebrow="Analytics" title="Insights" />
                <main className="min-h-0 flex-1 overflow-auto">{children}</main>
            </AppContent>
        </AppShell>
    );
}
