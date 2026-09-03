import { Building2, MessagesSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import type { SupportThread } from '@/types/support';

interface ThreadBoardViewProps {
    groupedThreadsMap: Record<string, SupportThread[]>;
    handleSelectThread: (id: string) => void;
    formatRelativeTime: (dateString?: string) => string;
}

export function ThreadBoardView({
    groupedThreadsMap,
    handleSelectThread,
    formatRelativeTime,
}: ThreadBoardViewProps) {
    return (
        <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto p-4">
            {Object.entries(groupedThreadsMap).map(
                ([groupTitle, groupThreads]) => (
                    <section
                        key={groupTitle}
                        className="flex max-h-full w-80 shrink-0 flex-col overflow-hidden rounded-lg border bg-muted/20"
                        aria-labelledby={`thread-group-${groupTitle}`}
                    >
                        <header className="flex items-center justify-between gap-3 border-b p-3">
                            <h2
                                id={`thread-group-${groupTitle}`}
                                className="truncate text-sm font-medium capitalize"
                            >
                                {groupTitle}
                            </h2>
                            <Badge variant="secondary">
                                {groupThreads.length}
                            </Badge>
                        </header>
                        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
                            {groupThreads.map((thread) => {
                                const organization =
                                    thread.tenant?.company?.name ||
                                    thread.tenant?.name ||
                                    'Anonymous customer';

                                return (
                                    <Card
                                        key={thread.id}
                                        role="button"
                                        tabIndex={0}
                                        className="cursor-pointer gap-3 py-4 transition-colors hover:bg-muted/50"
                                        onClick={() =>
                                            handleSelectThread(thread.id)
                                        }
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                                handleSelectThread(thread.id);
                                            }
                                        }}
                                    >
                                        <CardHeader className="px-4">
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Building2 className="size-3" />
                                                <span className="truncate">
                                                    {organization}
                                                </span>
                                            </div>
                                            <CardTitle className="truncate text-sm">
                                                {thread.sequence_number
                                                    ? `T-${thread.sequence_number} · `
                                                    : ''}
                                                {thread.title}
                                            </CardTitle>
                                            <CardDescription className="truncate">
                                                {thread.title ||
                                                    'No preview available'}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex flex-wrap gap-1 px-4">
                                            <Badge variant="secondary">
                                                {thread.tier?.name ||
                                                    'Free tier'}
                                            </Badge>
                                            {thread.labels?.map((label) => (
                                                <Badge
                                                    key={label.id}
                                                    variant="outline"
                                                >
                                                    {label.name}
                                                </Badge>
                                            ))}
                                        </CardContent>
                                        <CardFooter className="justify-between gap-3 px-4 text-xs text-muted-foreground">
                                            <span className="capitalize">
                                                {thread.priority ||
                                                    'Normal'}{' '}
                                            </span>
                                            <time>
                                                {formatRelativeTime(
                                                    thread.updated_at,
                                                )}
                                            </time>
                                        </CardFooter>
                                    </Card>
                                );
                            })}
                            {groupThreads.length === 0 && (
                                <Empty className="min-h-48 border-0 p-4">
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon">
                                            <MessagesSquare />
                                        </EmptyMedia>
                                        <EmptyTitle>No threads</EmptyTitle>
                                        <EmptyDescription>
                                            This group is empty.
                                        </EmptyDescription>
                                    </EmptyHeader>
                                </Empty>
                            )}
                        </div>
                    </section>
                ),
            )}
        </div>
    );
}
