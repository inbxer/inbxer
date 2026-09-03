import { SidebarTrigger } from '@/components/ui/sidebar';

type PlatformHeaderProps = {
    eyebrow: string;
    title: string;
};

export function PlatformHeader({ eyebrow, title }: PlatformHeaderProps) {
    return (
        <header className="sticky top-0 flex h-16 shrink-0 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-xl md:px-6">
            <SidebarTrigger />
            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">
                    {eyebrow}
                </p>
                <h1 className="truncate text-sm font-semibold">{title}</h1>
            </div>
        </header>
    );
}
