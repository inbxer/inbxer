import type { ReactNode } from 'react';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { ModeSwitcherRail } from '@/components/mode-switcher-rail';
import { PlatformHeader } from '@/components/platform-header';
import { PlatformSidebar } from '@/components/platform-sidebar';

export default function WorkflowsLayout({ children }: { children: ReactNode }) {
    return (
        <AppShell variant="sidebar">
            <ModeSwitcherRail mode="workflows" />
            <PlatformSidebar mode="workflows" />
            <AppContent variant="sidebar" className="min-w-0 overflow-hidden">
                <PlatformHeader eyebrow="Automation" title="Workflows" />
                <main className="min-h-0 flex-1 overflow-auto">{children}</main>
            </AppContent>
        </AppShell>
    );
}
