import { Building2, Globe2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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

export interface CompanyTier {
    id: string;
    name: string;
    color: string | null;
}
export interface CompanyOwner {
    id: number;
    name: string;
}
export interface CompanyItem {
    id: string;
    name: string;
    domain: string | null;
    logo_url: string | null;
    slug: string;
    contract_value: number;
    tier_id: string | null;
    owner_id: number | null;
    tenants_count?: number;
    created_at: string;
    tier?: CompanyTier | null;
    owner?: CompanyOwner | null;
}

interface CompanyTableProps {
    companies: CompanyItem[];
    onRowClick: (slug: string) => void;
}

export function CompanyTable({ companies, onRowClick }: CompanyTableProps) {
    if (companies.length === 0) {
        return (
            <Empty className="min-h-72 border">
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <Building2 />
                    </EmptyMedia>
                    <EmptyTitle>No companies found</EmptyTitle>
                    <EmptyDescription>
                        Try changing the filters or create your first company.
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
                        <TableHead>Company</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead className="text-right">
                            Contract value
                        </TableHead>
                        <TableHead>Account owner</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {companies.map((company) => (
                        <TableRow
                            key={company.id}
                            tabIndex={0}
                            role="link"
                            className="cursor-pointer"
                            onClick={() => onRowClick(company.slug)}
                            onKeyDown={(event) => {
                                if (
                                    event.key === 'Enter' ||
                                    event.key === ' '
                                ) {
                                    onRowClick(company.slug);
                                }
                            }}
                        >
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar className="size-9 rounded-lg">
                                        <AvatarFallback className="rounded-lg">
                                            <Building2 />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex min-w-0 flex-col gap-0.5">
                                        <span className="truncate font-medium">
                                            {company.name}
                                        </span>
                                        {company.domain && (
                                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Globe2 className="size-3" />
                                                {company.domain}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                {company.tier ? (
                                    <Badge variant="secondary">
                                        {company.tier.name}
                                    </Badge>
                                ) : (
                                    <span className="text-muted-foreground">
                                        —
                                    </span>
                                )}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                                {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'USD',
                                    maximumFractionDigits: 0,
                                }).format(company.contract_value)}
                            </TableCell>
                            <TableCell>
                                {company.owner?.name ?? (
                                    <span className="text-muted-foreground">
                                        Unassigned
                                    </span>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
