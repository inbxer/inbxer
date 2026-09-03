import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Building2, Plus, Star } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { CompanyTable } from '@/components/customers/company-table';
import type { CompanyItem } from '@/components/customers/company-table';
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

interface TierOption {
    id: string;
    name: string;
    color: string | null;
}
interface CompaniesPageProps {
    companies: CompanyItem[];
    tiers: TierOption[];
}

export default function CompaniesPage({
    companies,
    tiers,
}: CompaniesPageProps) {
    const { props } = usePage();
    const currentTeam = props.currentTeam;
    const [createOpen, setCreateOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [isStarred, setIsStarred] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        domain: '',
    });

    const handleCreateCompany = (event: FormEvent) => {
        event.preventDefault();
        post(currentTeam ? `/companies` : '/companies', {
            preserveScroll: true,
            onSuccess: () => {
                setCreateOpen(false);
                reset();
            },
        });
    };

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredCompanies = companies.filter((company) => {
        const matchesSearch =
            !normalizedQuery ||
            company.name.toLowerCase().includes(normalizedQuery) ||
            company.domain?.toLowerCase().includes(normalizedQuery);
        const matchesTier =
            !activeFilter.startsWith('tier:') ||
            company.tier_id === activeFilter.slice(5);

        return matchesSearch && matchesTier;
    });

    const openCompany = (slug: string) => {
        if (currentTeam) {
            router.get(`/companies/${slug}`);
        }
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <Head title="Companies" />
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex flex-col gap-1">
                    <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                        <Building2 className="size-5" />
                        Companies
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Group customers, ownership, tiers, and contract value.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant={isStarred ? 'secondary' : 'outline'}
                        size="icon"
                        onClick={() => setIsStarred((value) => !value)}
                        aria-label={
                            isStarred
                                ? 'Remove companies from favorites'
                                : 'Add companies to favorites'
                        }
                    >
                        <Star
                            className={isStarred ? 'fill-current' : undefined}
                        />
                    </Button>
                    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus data-icon="inline-start" />
                                Create company
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <form
                                onSubmit={handleCreateCompany}
                                className="flex flex-col gap-6"
                            >
                                <DialogHeader>
                                    <DialogTitle>Create company</DialogTitle>
                                    <DialogDescription>
                                        Group customers and track company-level
                                        ownership and SLAs.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="company-name">
                                            Name
                                        </Label>
                                        <Input
                                            id="company-name"
                                            value={data.name}
                                            onChange={(event) =>
                                                setData(
                                                    'name',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Acme Corp"
                                            autoFocus
                                            required
                                            aria-invalid={Boolean(errors.name)}
                                        />
                                        <InputError message={errors.name} />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="company-domain">
                                            Domain
                                        </Label>
                                        <Input
                                            id="company-domain"
                                            value={data.domain}
                                            onChange={(event) =>
                                                setData(
                                                    'domain',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="acme.com"
                                            aria-invalid={Boolean(
                                                errors.domain,
                                            )}
                                        />
                                        <InputError message={errors.domain} />
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
                                            : 'Create company'}
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
                    placeholder="Search companies or domains…"
                    aria-label="Search companies"
                />
                <Select value={activeFilter} onValueChange={setActiveFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filter companies" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectItem value="all">All companies</SelectItem>
                            <SelectItem value="my_accounts">
                                My accounts
                            </SelectItem>
                            {tiers.map((tier) => (
                                <SelectItem
                                    key={tier.id}
                                    value={`tier:${tier.id}`}
                                >
                                    {tier.name}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium">
                    {filteredCompanies.length}{' '}
                    {filteredCompanies.length === 1 ? 'company' : 'companies'}
                </p>
                {(searchQuery || activeFilter !== 'all') && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setSearchQuery('');
                            setActiveFilter('all');
                        }}
                    >
                        Clear filters
                    </Button>
                )}
            </div>
            <CompanyTable
                companies={filteredCompanies}
                onRowClick={openCompany}
            />
        </div>
    );
}
