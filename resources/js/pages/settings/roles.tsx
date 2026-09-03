import { Head } from '@inertiajs/react';

interface RoleRow {
    value: string;
    label: string;
    description: string;
    permissions: string[];
}

interface RolesSettingsPageProps {
    roles: RoleRow[];
}

export default function RolesSettingsPage({ roles }: RolesSettingsPageProps) {
    return (
        <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
            <Head title="Roles — Workspace Settings" />

            <div>
                <h1 className="text-xl font-semibold">Roles</h1>
                <p className="text-sm text-muted-foreground">
                    Every member is assigned one of these roles, which controls
                    what they can do in the workspace.
                </p>
            </div>

            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {roles.map((role) => (
                    <div key={role.value} className="p-4">
                        <p className="text-sm font-semibold">{role.label}</p>
                        <p className="text-xs text-muted-foreground">
                            {role.description}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
