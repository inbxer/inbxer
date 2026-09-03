import { X } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { Tenant } from '@/types/support';

interface ChangeCustomerModalProps {
    show: boolean;
    setShow: (show: boolean) => void;
    selectedTenantIdToChange: string;
    setSelectedTenantIdToChange: (id: string) => void;
    availableTenants: Tenant[];
    handleChangeCustomerForThread: (e: React.FormEvent) => void;
}

export function ChangeCustomerModal({
    show,
    setShow,
    selectedTenantIdToChange,
    setSelectedTenantIdToChange,
    availableTenants,
    handleChangeCustomerForThread,
}: ChangeCustomerModalProps) {
    return (
        <Dialog open={show} onOpenChange={setShow}>
            <DialogContent className="max-w-md space-y-4 rounded-2xl border-border bg-background p-5 text-foreground shadow-2xl">
                <DialogHeader className="flex flex-row items-start justify-between border-b border-border pb-3">
                    <div className="space-y-1">
                        <DialogTitle className="text-sm font-bold text-foreground">
                            Change customer
                        </DialogTitle>
                        <p className="text-xs leading-normal text-muted-foreground">
                            When you change the customer on a thread it will
                            take a few seconds for all changes to be reflected
                            within Plain.
                        </p>
                    </div>
                    <X
                        className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground"
                        onClick={() => setShow(false)}
                    />
                </DialogHeader>

                <form
                    onSubmit={handleChangeCustomerForThread}
                    className="space-y-5"
                >
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                            Pick a customer
                        </label>
                        <Select
                            value={selectedTenantIdToChange}
                            onValueChange={(val) =>
                                setSelectedTenantIdToChange(val)
                            }
                        >
                            <SelectTrigger className="h-9 w-full border border-border bg-card text-xs font-medium text-foreground focus:ring-1 focus:ring-primary">
                                <SelectValue placeholder="👤 Pick a customer" />
                            </SelectTrigger>
                            <SelectContent className="max-h-48 border-border bg-background text-foreground">
                                {availableTenants.map((t) => (
                                    <SelectItem
                                        key={t.id}
                                        value={t.id}
                                        className="cursor-pointer text-xs"
                                    >
                                        {t.name} ({t.email || 'No email'})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <Button
                            type="submit"
                            disabled={!selectedTenantIdToChange}
                            className="h-8 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-90"
                        >
                            Change customer
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShow(false)}
                            className="text-xs font-medium text-muted-foreground hover:text-foreground"
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
