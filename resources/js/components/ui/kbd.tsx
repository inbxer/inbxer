import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Visual badge for a keyboard shortcut, e.g. <Kbd keys={['Ctrl', 'Enter']} />.
 * Purely presentational — pair it with a real key listener (see
 * `useKeyboardShortcut`) rather than using it as a substitute for one.
 */
function Kbd({
    keys,
    className,
    ...props
}: React.ComponentProps<'kbd'> & { keys?: string[] }) {
    if (keys && keys.length > 0) {
        return (
            <span className="inline-flex items-center gap-0.5">
                {keys.map((key, index) => (
                    <React.Fragment key={key}>
                        {index > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                                +
                            </span>
                        )}
                        <kbd
                            data-slot="kbd"
                            className={cn(
                                'rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground',
                                className,
                            )}
                            {...props}
                        >
                            {key}
                        </kbd>
                    </React.Fragment>
                ))}
            </span>
        );
    }

    return (
        <kbd
            data-slot="kbd"
            className={cn(
                'rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground',
                className,
            )}
            {...props}
        />
    );
}

export { Kbd };
