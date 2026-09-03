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

interface CreateCompanyModalProps {
    show: boolean;
    setShow: (show: boolean) => void;
    newCompanyName: string;
    setNewCompanyName: (name: string) => void;
    newCompanyDomain: string;
    setNewCompanyDomain: (domain: string) => void;
    handleCreateNewCompany: (e: React.FormEvent) => void;
}

export function CreateCompanyModal({
    show,
    setShow,
    newCompanyName,
    setNewCompanyName,
    newCompanyDomain,
    setNewCompanyDomain,
    handleCreateNewCompany,
}: CreateCompanyModalProps) {
    return (
        <Dialog open={show} onOpenChange={setShow}>
            <DialogContent className="max-w-sm space-y-4 rounded-xl border-border bg-background p-4 text-foreground">
                <DialogHeader className="flex flex-row items-center justify-between">
                    <DialogTitle className="text-xs font-bold text-foreground">
                        Create new company
                    </DialogTitle>
                    <X
                        className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-foreground"
                        onClick={() => setShow(false)}
                    />
                </DialogHeader>

                <form onSubmit={handleCreateNewCompany} className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                            Company Name
                        </label>
                        <Input
                            type="text"
                            value={newCompanyName}
                            onChange={(e) => setNewCompanyName(e.target.value)}
                            placeholder="Acme Inc."
                            className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">
                            Domain (optional)
                        </label>
                        <Input
                            type="text"
                            value={newCompanyDomain}
                            onChange={(e) =>
                                setNewCompanyDomain(e.target.value)
                            }
                            placeholder="acme.com"
                            className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <Button
                            type="submit"
                            disabled={!newCompanyName.trim()}
                            className="h-8 rounded-lg bg-primary px-4 text-xs text-primary-foreground hover:opacity-90"
                        >
                            Create
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
