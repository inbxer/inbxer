import { Head, router } from '@inertiajs/react';
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

export interface AiAutomationsSettings {
    auto_labeling_enabled: boolean;
    urgency_detection_enabled: boolean;
    thread_titles_enabled: boolean;
    thread_catchups_enabled: boolean;
    similar_threads_enabled: boolean;
}

interface AiAutomationsPageProps {
    settings: AiAutomationsSettings;
}

const AUTOMATIONS: Array<{
    key: keyof AiAutomationsSettings;
    title: string;
    description: string;
}> = [
    {
        key: 'auto_labeling_enabled',
        title: 'Auto-labeling',
        description: 'Automatically apply labels based on thread content.',
    },
    {
        key: 'urgency_detection_enabled',
        title: 'Urgency detection',
        description: 'Flag threads that need immediate attention.',
    },
    {
        key: 'thread_titles_enabled',
        title: 'Thread titles',
        description: 'Generate a short descriptive title for each thread.',
    },
    {
        key: 'thread_catchups_enabled',
        title: 'Thread catch-ups',
        description: 'Summarize a thread so agents can catch up quickly.',
    },
    {
        key: 'similar_threads_enabled',
        title: 'Similar threads',
        description: 'Surface related past threads for context.',
    },
];

export default function AiAutomationsPage({
    settings,
}: AiAutomationsPageProps) {
    const [values, setValues] = React.useState<AiAutomationsSettings>(settings);

    const toggle = (key: keyof AiAutomationsSettings) => {
        const next = { ...values, [key]: !values[key] };
        setValues(next);
        router.patch('/ai/automations', next, { preserveScroll: true });
    };

    return (
        <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
            <Head title="Automations — AI Agent" />

            <div className="space-y-3">
                {AUTOMATIONS.map((automation) => (
                    <Card key={automation.key}>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm font-medium">
                                    {automation.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {automation.description}
                                </p>
                            </div>
                            <Switch
                                checked={values[automation.key]}
                                onCheckedChange={() => toggle(automation.key)}
                            />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
