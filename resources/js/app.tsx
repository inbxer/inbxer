import { createInertiaApp } from '@inertiajs/react';
import '@/echo';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import { ConfirmProvider } from '@/hooks/use-confirm';
import AiLayout from '@/layouts/ai-layout';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import InsightsLayout from '@/layouts/insights-layout';
import SettingsLayout from '@/layouts/settings-layout';
import SupportLayout from '@/layouts/support-layout';
import WorkflowsLayout from '@/layouts/workflows-layout';

const appName = import.meta.env.VITE_APP_NAME || 'Inbxer';

createInertiaApp({
    title: (title) => {
        if (!title) {
            return appName;
        }

        if (
            title === appName ||
            title.endsWith(` - ${appName}`) ||
            title.endsWith(` — ${appName}`)
        ) {
            return title;
        }

        return `${title} — ${appName}`;
    },
    layout: (name) => {
        switch (true) {
            case name === 'workflows/builder':
                return null;
            case name.startsWith('csat/'):
                return null;
            case name.startsWith('auth/'):
            case name === 'onboarding/workspace':
                return AuthLayout;
            case name.startsWith('workflows/'):
                return WorkflowsLayout;
            case name.startsWith('ai/'):
                return AiLayout;
            case name.startsWith('insights/'):
                return InsightsLayout;
            case name.startsWith('settings/'):
                return SettingsLayout;
            case name.startsWith('support/'):
                return SupportLayout;
            case name.startsWith('teams/'):
                return SettingsLayout;
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                <ConfirmProvider>
                    {app}
                    <Toaster />
                </ConfirmProvider>
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
