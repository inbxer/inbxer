import * as React from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ConfirmOptions {
    title?: string;
    description: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    /** Uses the destructive button style for irreversible actions. */
    variant?: 'default' | 'destructive';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn | null>(null);

interface PendingConfirm {
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const [pending, setPending] = React.useState<PendingConfirm | null>(null);

    const confirm = React.useCallback<ConfirmFn>((options) => {
        return new Promise<boolean>((resolve) => {
            setPending({ options, resolve });
        });
    }, []);

    const settle = (value: boolean) => {
        pending?.resolve(value);
        setPending(null);
    };

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            <AlertDialog
                open={pending !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        settle(false);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {pending?.options.title ?? 'Are you sure?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {pending?.options.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => settle(false)}>
                            {pending?.options.cancelText ?? 'Cancel'}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => settle(true)}
                            className={cn(
                                pending?.options.variant === 'destructive' &&
                                    buttonVariants({ variant: 'destructive' }),
                            )}
                        >
                            {pending?.options.confirmText ?? 'Confirm'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ConfirmContext.Provider>
    );
}

/**
 * Promise-based replacement for `window.confirm()` backed by a themed
 * AlertDialog: `if (await confirm({ description: '...' })) { ... }`.
 */
export function useConfirm(): ConfirmFn {
    const confirm = React.useContext(ConfirmContext);

    if (!confirm) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }

    return confirm;
}
