import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { CompanyDetails } from '@/types/support';

interface DomainMismatchModalProps {
    show: boolean;
    setShow: (show: boolean) => void;
    tenantEmailDomain: string;
    pendingCompanyToLink: CompanyDetails | null;
    executeAttachCompany: (companyId: string) => void;
}

export function DomainMismatchModal({
    show,
    setShow,
    tenantEmailDomain,
    pendingCompanyToLink,
    executeAttachCompany,
}: DomainMismatchModalProps) {
    return (
        <Dialog open={show} onOpenChange={setShow}>
            <DialogContent className="max-w-sm space-y-4 rounded-xl border-border bg-background p-4 text-foreground">
                <DialogHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
                    <DialogTitle className="text-sm font-bold text-foreground">
                        Are you sure?
                    </DialogTitle>
                    <X
                        className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground"
                        onClick={() => setShow(false)}
                    />
                </DialogHeader>

                <p className="text-xs leading-relaxed text-muted-foreground">
                    The customer's email domain (
                    <span className="font-mono text-foreground">
                        {tenantEmailDomain}
                    </span>
                    ) does not match the company's domain (
                    <span className="font-mono text-foreground">
                        {pendingCompanyToLink?.domain ||
                            `${pendingCompanyToLink?.name.toLowerCase().replace(/\s+/g, '')}.com`}
                    </span>
                    ). Are you sure you want to proceed?
                </p>

                <div className="flex items-center gap-2 pt-2">
                    <Button
                        onClick={() =>
                            pendingCompanyToLink &&
                            executeAttachCompany(pendingCompanyToLink.id)
                        }
                        className="h-8 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-90"
                    >
                        Yes, I'm sure
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
            </DialogContent>
        </Dialog>
    );
}
