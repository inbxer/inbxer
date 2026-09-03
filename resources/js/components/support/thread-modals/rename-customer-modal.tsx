import { X } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface RenameCustomerModalProps {
    show: boolean;
    setShow: (show: boolean) => void;
    renameCustomerName: string;
    setRenameCustomerName: (name: string) => void;
    handleRenameCustomer: (e: React.FormEvent) => void;
}

export function RenameCustomerModal({
    show,
    setShow,
    renameCustomerName,
    setRenameCustomerName,
    handleRenameCustomer,
}: RenameCustomerModalProps) {
    return (
        <Dialog open={show} onOpenChange={setShow}>
            <DialogContent className="max-w-sm space-y-4 rounded-xl border-border bg-background p-4 text-foreground">
                <DialogHeader className="flex flex-row items-center justify-between">
                    <DialogTitle className="text-xs font-bold text-foreground">
                        Rename customer
                    </DialogTitle>
                    <X
                        className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-foreground"
                        onClick={() => setShow(false)}
                    />
                </DialogHeader>

                <form onSubmit={handleRenameCustomer} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                            Customer Name
                        </label>
                        <Input
                            type="text"
                            value={renameCustomerName}
                            onChange={(e) =>
                                setRenameCustomerName(e.target.value)
                            }
                            className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                            autoFocus
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <Button
                            type="submit"
                            className="h-8 rounded-lg bg-primary px-4 text-xs text-primary-foreground hover:opacity-90"
                        >
                            Save
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShow(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
