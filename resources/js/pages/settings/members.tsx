import { Head, router, usePage } from '@inertiajs/react';
import { ChevronDown, UserPlus, X } from 'lucide-react';
import React from 'react';
import InviteMemberModal from '@/components/invite-member-modal';
import RemoveMemberModal from '@/components/remove-member-modal';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useInitials } from '@/hooks/use-initials';
import { update as updateMember } from '@/routes/teams/members';
import type { RoleOption, Team, TeamMember } from '@/types';

interface InvitedRow {
    code: string;
    email: string;
    role: string;
    role_label: string;
    created_at: string | null;
}

interface OtherRow {
    code: string;
    email: string;
    role: string;
    role_label: string;
    expired_at: string | null;
}

interface MembersPageProps {
    stats: {
        owners_and_admins: number;
        support: number;
        viewers: number;
    };
    activeMembers: TeamMember[];
    invitedMembers: InvitedRow[];
    otherMembers: OtherRow[];
    availableRoles: RoleOption[];
}

export default function MembersSettingsPage({
    stats,
    activeMembers,
    invitedMembers,
    otherMembers,
    availableRoles,
}: MembersPageProps) {
    const { props } = usePage();
    const currentTeam = props.currentTeam as
        { slug: string; name: string } | undefined;
    const getInitials = useInitials();

    const [tab, setTab] = React.useState<'active' | 'other' | 'invited'>(
        'active',
    );
    const [query, setQuery] = React.useState('');
    const [inviteOpen, setInviteOpen] = React.useState(false);
    const [removeOpen, setRemoveOpen] = React.useState(false);
    const [memberToRemove, setMemberToRemove] =
        React.useState<TeamMember | null>(null);

    const team: Team = {
        id: 0,
        name: currentTeam?.name ?? '',
        slug: currentTeam?.slug ?? '',
        isPersonal: false,
    };

    const updateMemberRole = (member: TeamMember, newRole: string) => {
        router.visit(updateMember([team.slug, member.id]), {
            data: { role: newRole },
            preserveScroll: true,
        });
    };

    const confirmRemoveMember = (member: TeamMember) => {
        setMemberToRemove(member);
        setRemoveOpen(true);
    };

    const filteredMembers = activeMembers.filter(
        (m) =>
            !query.trim() ||
            m.name.toLowerCase().includes(query.toLowerCase()) ||
            m.email.toLowerCase().includes(query.toLowerCase()),
    );

    return (
        <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
            <Head title="Members — Workspace Settings" />

            <div>
                <h1 className="text-xl font-semibold">Members</h1>
                <p className="text-sm text-muted-foreground">
                    Manage your team members and their roles.
                </p>
            </div>

            <div className="flex items-center justify-between">
                <Tabs
                    value={tab}
                    onValueChange={(v) => setTab(v as typeof tab)}
                >
                    <TabsList variant="line">
                        <TabsTrigger value="active">Active</TabsTrigger>
                        <TabsTrigger value="other">Other</TabsTrigger>
                        <TabsTrigger value="invited">Invited</TabsTrigger>
                    </TabsList>
                </Tabs>
                <Button onClick={() => setInviteOpen(true)}>
                    <UserPlus data-icon="inline-start" />
                    Invite member
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border p-4 text-center">
                    <p className="text-2xl font-semibold">
                        {stats.owners_and_admins}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Owners &amp; Admins
                    </p>
                </div>
                <div className="rounded-lg border border-border p-4 text-center">
                    <p className="text-2xl font-semibold">{stats.support}</p>
                    <p className="text-xs text-muted-foreground">
                        Support members
                    </p>
                </div>
                <div className="rounded-lg border border-border p-4 text-center">
                    <p className="text-2xl font-semibold">{stats.viewers}</p>
                    <p className="text-xs text-muted-foreground">
                        Viewer members
                    </p>
                </div>
            </div>

            {tab === 'active' && (
                <>
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search members"
                    />
                    <div className="space-y-2">
                        {filteredMembers.map((member) => (
                            <div
                                key={member.id}
                                className="flex items-center justify-between rounded-lg border border-border p-3"
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar className="size-9">
                                        <AvatarFallback>
                                            {getInitials(member.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-medium">
                                            {member.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {member.email}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {member.role === 'owner' ? (
                                        <Badge variant="secondary">
                                            {member.role_label}
                                        </Badge>
                                    ) : (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    {member.role_label}
                                                    <ChevronDown className="ml-1 size-3.5 opacity-50" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                {availableRoles.map((role) => (
                                                    <DropdownMenuItem
                                                        key={role.value}
                                                        onSelect={() =>
                                                            updateMemberRole(
                                                                member,
                                                                role.value,
                                                            )
                                                        }
                                                    >
                                                        {role.label}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                    {member.role !== 'owner' && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                confirmRemoveMember(member)
                                            }
                                        >
                                            <X className="size-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {filteredMembers.length === 0 && (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                No members found.
                            </p>
                        )}
                    </div>
                </>
            )}

            {tab === 'invited' && (
                <div className="space-y-2">
                    {invitedMembers.map((invitation) => (
                        <div
                            key={invitation.code}
                            className="flex items-center justify-between rounded-lg border border-border p-3"
                        >
                            <div>
                                <p className="text-sm font-medium">
                                    {invitation.email}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Invited as {invitation.role_label}
                                </p>
                            </div>
                            <Badge variant="outline">Pending</Badge>
                        </div>
                    ))}
                    {invitedMembers.length === 0 && (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                            No pending invitations.
                        </p>
                    )}
                </div>
            )}

            {tab === 'other' && (
                <div className="space-y-2">
                    {otherMembers.map((invitation) => (
                        <div
                            key={invitation.code}
                            className="flex items-center justify-between rounded-lg border border-border p-3"
                        >
                            <div>
                                <p className="text-sm font-medium">
                                    {invitation.email}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Invitation expired
                                </p>
                            </div>
                            <Badge variant="outline">Expired</Badge>
                        </div>
                    ))}
                    {otherMembers.length === 0 && (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                            Nothing here.
                        </p>
                    )}
                </div>
            )}

            <InviteMemberModal
                team={team}
                availableRoles={availableRoles}
                open={inviteOpen}
                onOpenChange={setInviteOpen}
            />
            <RemoveMemberModal
                team={team}
                member={memberToRemove}
                open={removeOpen}
                onOpenChange={setRemoveOpen}
            />
        </div>
    );
}
