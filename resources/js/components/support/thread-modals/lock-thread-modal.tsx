import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface LockThreadModalProps {
    show: boolean;
    setShow: (show: boolean) => void;
    handleLockThreadSubmit: () => void;
}

export function LockThreadModal({
    show,
    setShow,
    handleLockThreadSubmit,
}: LockThreadModalProps) {
    return (
        <Dialog open={show} onOpenChange={setShow}>
            <DialogContent className="max-w-md space-y-4 rounded-2xl border-border bg-background p-5 text-foreground shadow-2xl">
                <DialogHeader className="flex flex-row items-start justify-between border-b border-border pb-3">
                    <DialogTitle className="text-sm font-bold text-foreground">
                        Lock thread
                    </DialogTitle>
                    <X
                        className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground"
                        onClick={() => setShow(false)}
                    />
                </DialogHeader>

                <p className="text-xs leading-relaxed text-muted-foreground">
                    If you lock this thread, it can't be unlocked. Any new
                    messages from the customer will start a new thread instead.
                </p>

                <div className="flex items-center justify-end gap-3 pt-3">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShow(false)}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                        Cancel
                    </Button>

                    <Button
                        onClick={handleLockThreadSubmit}
                        className="h-8 rounded-lg bg-destructive px-4 text-xs font-semibold text-destructive-foreground hover:opacity-90"
                    >
                        Lock thread
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
