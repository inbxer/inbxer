import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TaskFilterBarProps {
    tab: string;
    counts: { my_tasks: number; all_tasks: number; done: number };
    onTabChange: (newTab: string) => void;
    isInlineCreating: boolean;
    onStartInlineCreate: () => void;
}

export function TaskFilterBar({
    tab,
    counts,
    onTabChange,
    isInlineCreating,
    onStartInlineCreate,
}: TaskFilterBarProps) {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Tasks
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Track follow-ups and work across customer conversations.
                    </p>
                </div>
                {!isInlineCreating && (
                    <Button onClick={onStartInlineCreate}>
                        <Plus data-icon="inline-start" />
                        Add task <Badge variant="secondary">T</Badge>
                    </Button>
                )}
            </div>
            <Tabs value={tab} onValueChange={onTabChange}>
                <TabsList>
                    <TabsTrigger value="my_tasks">
                        My tasks{' '}
                        <Badge variant="secondary">{counts.my_tasks}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="all_tasks">
                        All tasks{' '}
                        <Badge variant="secondary">{counts.all_tasks}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="done">
                        Done <Badge variant="secondary">{counts.done}</Badge>
                    </TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
    );
}
