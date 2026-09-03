import { Head, router } from '@inertiajs/react';
import React from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

interface AiSuggestedResponsesPageProps {
    suggestedResponsesEnabled: boolean;
}

export default function AiSuggestedResponsesPage({
    suggestedResponsesEnabled,
}: AiSuggestedResponsesPageProps) {
    const [enabled, setEnabled] = React.useState(suggestedResponsesEnabled);

    const toggle = (value: boolean) => {
        setEnabled(value);
        router.patch(
            '/ai/suggested-responses',
            { suggested_responses_enabled: value },
            { preserveScroll: true },
        );
    };

    return (
        <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
            <Head title="Suggested responses — AI Agent" />

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">
                        Suggested responses
                    </CardTitle>
                    <CardDescription>
                        Show agents an AI-drafted reply they can insert with one
                        click from the reply composer.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                        Enable suggested responses
                    </p>
                    <Switch checked={enabled} onCheckedChange={toggle} />
                </CardContent>
            </Card>
        </div>
    );
}
