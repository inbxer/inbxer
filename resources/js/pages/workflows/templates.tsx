import { Head, router } from '@inertiajs/react';
import { Sparkles } from 'lucide-react';
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TemplateItem {
    key: string;
    name: string;
    description: string;
    tags: string[];
}

interface TemplatesPageProps {
    templates: TemplateItem[];
}

export default function WorkflowTemplatesPage({
    templates = [],
}: TemplatesPageProps) {
    const [creating, setCreating] = React.useState(false);

    const handleUseTemplate = (key: string) => {
        if (creating) {
            return;
        }

        setCreating(true);
        router.post(
            `/workflows`,
            { template: key },
            { onFinish: () => setCreating(false) },
        );
    };

    return (
        <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
            <Head title="Workflow templates" />

            <div>
                <h1 className="text-xl font-semibold">Templates</h1>
                <p className="text-sm text-muted-foreground">
                    Start from a pre-built workflow and customize it in the
                    builder.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {templates.map((template) => (
                    <div
                        key={template.key}
                        className="flex flex-col justify-between gap-3 rounded-lg border border-border p-4"
                    >
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                                <Sparkles className="size-4 text-primary" />
                                <h3 className="text-sm font-semibold">
                                    {template.name}
                                </h3>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {template.description}
                            </p>
                            <div className="flex flex-wrap gap-1 pt-1">
                                {template.tags.map((tag) => (
                                    <Badge
                                        key={tag}
                                        variant="secondary"
                                        className="text-[10px]"
                                    >
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={creating}
                            onClick={() => handleUseTemplate(template.key)}
                        >
                            Use template
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
