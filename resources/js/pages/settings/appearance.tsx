import { Head } from '@inertiajs/react';
import AppearanceTabs from '@/components/appearance-tabs';

export default function Appearance() {
    return (
        <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
            <Head title="Appearance" />

            <div>
                <h1 className="text-xl font-semibold">Appearance</h1>
                <p className="text-sm text-muted-foreground">
                    Update the appearance settings for your account.
                </p>
            </div>

            <AppearanceTabs />
        </div>
    );
}
