<?php

namespace App\Domain\Team\Enums;

enum TeamRole: string
{
    case Owner = 'owner';
    case Admin = 'admin';
    case Support = 'support';
    case Viewer = 'viewer';
    /** @deprecated Kept for backward compatibility with existing memberships; no longer assignable to new invites. */
    case Member = 'member';

    /**
     * Get the display label for the role.
     */
    public function label(): string
    {
        return ucfirst($this->value);
    }

    /**
     * Get a one-line description of what this role can do, matching the
     * language shown on the Roles settings page.
     */
    public function description(): string
    {
        return match ($this) {
            self::Owner => 'Full access to everything. Delete workspaces, manage workspace settings and API keys.',
            self::Admin => 'Access to everything except for deleting workspaces.',
            self::Support => 'Can message customers and use all app features.',
            self::Viewer => 'View all support requests and participate in internal discussions. Cannot send messages to customers.',
            self::Member => 'Legacy role kept for existing members, with the same permissions as Support.',
        };
    }

    /**
     * Get all the permissions for this role.
     *
     * @return array<TeamPermission>
     */
    public function permissions(): array
    {
        return match ($this) {
            self::Owner => TeamPermission::cases(),
            self::Admin => [
                TeamPermission::UpdateTeam,
                TeamPermission::CreateInvitation,
                TeamPermission::CancelInvitation,
                TeamPermission::MessageCustomers,
                TeamPermission::ViewSupportRequests,
                TeamPermission::ParticipateInternalDiscussions,
                TeamPermission::ManageApiKeys,
            ],
            self::Support => [
                TeamPermission::MessageCustomers,
                TeamPermission::ViewSupportRequests,
                TeamPermission::ParticipateInternalDiscussions,
            ],
            self::Viewer => [
                TeamPermission::ViewSupportRequests,
                TeamPermission::ParticipateInternalDiscussions,
            ],
            // Grandfathered at the same permissions as Support so existing
            // memberships created before Support/Viewer existed keep working
            // exactly as before (they could always reply to threads).
            self::Member => [
                TeamPermission::MessageCustomers,
                TeamPermission::ViewSupportRequests,
                TeamPermission::ParticipateInternalDiscussions,
            ],
        };
    }

    /**
     * Determine if the role has the given permission.
     */
    public function hasPermission(TeamPermission $permission): bool
    {
        return in_array($permission, $this->permissions());
    }

    /**
     * Get the hierarchy level for this role.
     * Higher numbers indicate higher privileges.
     */
    public function level(): int
    {
        return match ($this) {
            self::Owner => 5,
            self::Admin => 4,
            self::Support => 3,
            self::Member => 2,
            self::Viewer => 1,
        };
    }

    /**
     * Check if this role is at least as privileged as another role.
     */
    public function isAtLeast(TeamRole $role): bool
    {
        return $this->level() >= $role->level();
    }

    /**
     * Get the roles that can be assigned to team members (excludes Owner
     * and the legacy Member role, which is no longer offered for new
     * invites/role changes but stays valid for existing memberships).
     *
     * @return array<array{value: string, label: string}>
     */
    public static function assignable(): array
    {
        return collect(self::cases())
            ->filter(fn (self $role) => ! in_array($role, [self::Owner, self::Member], true))
            ->map(fn (self $role) => ['value' => $role->value, 'label' => $role->label()])
            ->values()
            ->toArray();
    }
}
