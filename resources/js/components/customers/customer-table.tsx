import { router } from '@inertiajs/react';
import { Building2, MoreHorizontal, Trash2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export interface TenantItem {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    company_id: string | null;
    tier_id: string | null;
    company?: { id: string; name: string } | null;
    tier?: { id: string; name: string } | null;
    created_at: string;
}

interface CustomerTableProps {
    tenants: TenantItem[];
    currentTeam?: { slug: string };
    onDeleteTenant: (tenant: TenantItem) => void;
}

export function CustomerTable({
    tenants,
    currentTeam,
    onDeleteTenant,
}: CustomerTableProps) {
    const openTenant = (tenant: TenantItem) =>
        router.get(
            currentTeam ? `/tenants/${tenant.id}` : `/tenants/${tenant.id}`,
        );

    if (tenants.length === 0) {
        return (
            <Empty className="min-h-72 border">
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <Users />
                    </EmptyMedia>
                    <EmptyTitle>No tenants found</EmptyTitle>
                    <EmptyDescription>
                        Try changing the filters or create your first tenant.
                    </EmptyDescription>
                </EmptyHeader>
            </Empty>
        );
    }

    return (
        <div className="overflow-hidden rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Tenant</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead className="w-12">
                            <span className="sr-only">Actions</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tenants.map((tenant) => (
                        <TableRow
                            key={tenant.id}
                            className="cursor-pointer"
                            onClick={() => openTenant(tenant)}
                        >
                            <TableCell>
                                <div className="flex min-w-0 flex-col">
                                    <span className="truncate font-medium">
                                        {tenant.name}
                                    </span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        {tenant.email}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell>
                                {tenant.company?.name ?? (
                                    <span className="text-muted-foreground">
                                        Unassigned
                                    </span>
                                )}
                            </TableCell>
                            <TableCell>
                                <Badge variant="secondary">
                                    {tenant.tier?.name ?? 'Free Tier'}
                                </Badge>
                            </TableCell>
                            <TableCell
                                onClick={(event) => event.stopPropagation()}
                            >
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label={`Actions for ${tenant.name}`}
                                        >
                                            <MoreHorizontal />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuGroup>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    openTenant(tenant)
                                                }
                                            >
                                                <Building2 />
                                                Open profile
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                variant="destructive"
                                                onClick={() =>
                                                    onDeleteTenant(tenant)
                                                }
                                            >
                                                <Trash2 />
                                                Delete tenant
                                            </DropdownMenuItem>
                                        </DropdownMenuGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
