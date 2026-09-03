import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Plus, Star, Trash2, Users } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { CustomerTable } from '@/components/customers/customer-table';
import type { TenantItem } from '@/components/customers/customer-table';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface TierOption {
    id: string;
    name: string;
}
interface TenantsPageProps {
    tenants: TenantItem[];
    tiers: TierOption[];
}

export default function TenantsPage({ tenants, tiers }: TenantsPageProps) {
    const { props } = usePage();
    const currentTeam = props.currentTeam as { slug: string } | null;
    const [createOpen, setCreateOpen] = useState(false);
    const [tenantToDelete, setTenantToDelete] = useState<TenantItem | null>(
        null,
    );
    const [deleting, setDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTier, setSelectedTier] = useState('all');
    const [isStarred, setIsStarred] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        external_id: '',
    });

    const handleCreateTenant = (event: FormEvent) => {
        event.preventDefault();
        post(currentTeam ? `/tenants` : '/tenants', {
            preserveScroll: true,
            onSuccess: () => {
                setCreateOpen(false);
                reset();
                toast.success('Tenant created successfully.');
            },
        });
    };

    const handleDeleteTenant = () => {
        if (!tenantToDelete) {
            return;
        }

        setDeleting(true);
        router.delete(
            currentTeam
                ? `/tenants/${tenantToDelete.id}`
                : `/tenants/${tenantToDelete.id}`,
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Tenant deleted successfully.');
                    setTenantToDelete(null);
                },
                onFinish: () => setDeleting(false),
            },
        );
    };

    const query = searchQuery.trim().toLowerCase();
    const filteredTenants = tenants.filter((tenant) => {
        const matchesSearch =
            !query ||
            tenant.name.toLowerCase().includes(query) ||
            tenant.email.toLowerCase().includes(query);
        const matchesTier =
            selectedTier === 'all' || tenant.tier_id === selectedTier;

        return matchesSearch && matchesTier;
    });

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <Head title="Tenants" />
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex flex-col gap-1">
                    <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                        <Users className="size-5" />
                        Tenants
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Manage customer workspaces, tiers, and external
                        identities.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={isStarred ? 'secondary' : 'outline'}
                                size="icon"
                                onClick={() => setIsStarred((value) => !value)}
                                aria-label={
                                    isStarred
                                        ? 'Remove tenants from favorites'
                                        : 'Add tenants to favorites'
                                }
                            >
                                <Star
                                    className={
                                        isStarred ? 'fill-current' : undefined
                                    }
                                />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {isStarred
                                ? 'Remove from Favorites'
                                : 'Add to Favorites'}
                        </TooltipContent>
                    </Tooltip>
                    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus data-icon="inline-start" />
                                Create tenant
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <form
                                onSubmit={handleCreateTenant}
                                className="flex flex-col gap-6"
                            >
                                <DialogHeader>
                                    <DialogTitle>Create tenant</DialogTitle>
                                    <DialogDescription>
                                        Create a customer workspace that can be
                                        matched to support requests and SLAs.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="tenant-name">
                                            Tenant name
                                        </Label>
                                        <Input
                                            id="tenant-name"
                                            value={data.name}
                                            onChange={(event) =>
                                                setData(
                                                    'name',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Acme Support Team"
                                            autoFocus
                                            required
                                            aria-invalid={Boolean(errors.name)}
                                        />
                                        <InputError message={errors.name} />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="tenant-external-id">
                                            External ID
                                        </Label>
                                        <Input
                                            id="tenant-external-id"
                                            value={data.external_id}
                                            onChange={(event) =>
                                                setData(
                                                    'external_id',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="ext_9201a"
                                            aria-invalid={Boolean(
                                                errors.external_id,
                                            )}
                                        />
                                        <InputError
                                            message={errors.external_id}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setCreateOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={processing}>
                                        {processing && (
                                            <Spinner data-icon="inline-start" />
                                        )}
                                        {processing
                                            ? 'Creating…'
                                            : 'Create tenant'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </header>
            <Separator />
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <Input
                    className="w-full sm:max-w-xs"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search tenants or email…"
                    aria-label="Search tenants"
                />
                <Select value={selectedTier} onValueChange={setSelectedTier}>
                    <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filter by tier" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectItem value="all">All tiers</SelectItem>
                            {tiers.map((tier) => (
                                <SelectItem key={tier.id} value={tier.id}>
                                    {tier.name}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium">
                    {filteredTenants.length}{' '}
                    {filteredTenants.length === 1 ? 'tenant' : 'tenants'}
                </p>
                {(searchQuery || selectedTier !== 'all') && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setSearchQuery('');
                            setSelectedTier('all');
                        }}
                    >
                        Clear filters
                    </Button>
                )}
            </div>
            <CustomerTable
                tenants={filteredTenants}
                currentTeam={currentTeam ?? undefined}
                onDeleteTenant={setTenantToDelete}
            />

            <Dialog
                open={Boolean(tenantToDelete)}
                onOpenChange={(open) => !open && setTenantToDelete(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete tenant?</DialogTitle>
                        <DialogDescription>
                            This permanently deletes {tenantToDelete?.name}.
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setTenantToDelete(null)}
                            disabled={deleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteTenant}
                            disabled={deleting}
                        >
                            {deleting ? (
                                <Spinner data-icon="inline-start" />
                            ) : (
                                <Trash2 data-icon="inline-start" />
                            )}
                            {deleting ? 'Deleting…' : 'Delete tenant'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
