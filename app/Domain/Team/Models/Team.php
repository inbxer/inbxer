<?php

namespace App\Domain\Team\Models;

use App\Domain\Channel\Models\Channel;
use App\Domain\CustomField\Models\CustomFieldDefinition;
use App\Domain\Integration\Models\ApiKey;
use App\Domain\Integration\Models\Webhook;
use App\Domain\Label\Models\Label;
use App\Domain\Sla\Models\BusinessHours;
use App\Domain\Sla\Models\SlaPolicy;
use App\Domain\Support\Models\Snippet;
use App\Domain\Support\Models\Task;
use App\Domain\Team\Concerns\GeneratesUniqueTeamSlugs;
use App\Domain\Team\Enums\TeamRole;
use App\Domain\Tenant\Models\Company;
use App\Domain\Tenant\Models\CustomerGroup;
use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Models\Thread;
use App\Domain\Tier\Models\Tier;
use App\Domain\Workflow\Models\Workflow;
use App\Models\User;
use Database\Factories\TeamFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

/**
 * @property int $id
 * @property string $name
 * @property string|null $internal_name
 * @property string|null $logo_path
 * @property string $slug
 * @property bool $is_personal
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Collection<int, TeamInvitation> $invitations
 * @property-read Collection<int, Membership> $memberships
 * @property-read Collection<int, User> $members
 * @property-read Collection<int, Company> $companies
 * @property-read Collection<int, Tenant> $tenants
 * @property-read Collection<int, Label> $labels
 * @property-read Collection<int, Tier> $tiers
 * @property-read Collection<int, Channel> $channels
 * @property-read Collection<int, Thread> $threads
 * @property-read Collection<int, CustomFieldDefinition> $customFieldDefinitions
 * @property-read Collection<int, Workflow> $workflows
 * @property-read Collection<int, SlaPolicy> $slaPolicies
 * @property-read Collection<int, BusinessHours> $businessHours
 * @property-read Collection<int, CustomerGroup> $customerGroups
 * @property-read Collection<int, Snippet> $snippets
 * @property-read Collection<int, Task> $tasks
 * @property-read Collection<int, ApiKey> $apiKeys
 * @property-read Collection<int, Webhook> $webhooks
 */
#[Fillable(['name', 'internal_name', 'logo_path', 'slug', 'is_personal', 'settings'])]
class Team extends Model implements HasMedia
{
    /** @use HasFactory<TeamFactory> */
    use GeneratesUniqueTeamSlugs, HasFactory, InteractsWithMedia, SoftDeletes;

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('logo')->singleFile();
    }

    protected static function newFactory(): TeamFactory
    {
        return TeamFactory::new();
    }

    /**
     * Bootstrap the model and its traits.
     */
    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Team $team) {
            if (empty($team->slug)) {
                $team->slug = static::generateUniqueTeamSlug();
            }
        });
    }

    /**
     * Get the team owner.
     */
    public function owner(): ?Model
    {
        return $this->members()
            ->wherePivot('role', TeamRole::Owner->value)
            ->first();
    }

    /**
     * Get all members of this team.
     *
     * @return BelongsToMany<User, $this, Membership, 'pivot'>
     */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'team_members', 'team_id', 'user_id')
            ->using(Membership::class)
            ->withPivot(['role'])
            ->withTimestamps();
    }

    /**
     * Get all memberships for this team.
     *
     * @return HasMany<Membership, $this>
     */
    public function memberships(): HasMany
    {
        return $this->hasMany(Membership::class);
    }

    /**
     * Get all invitations for this team.
     *
     * @return HasMany<TeamInvitation, $this>
     */
    public function invitations(): HasMany
    {
        return $this->hasMany(TeamInvitation::class);
    }

    // ──────────────────────────────────────────────
    // Domain Relationships
    // ──────────────────────────────────────────────

    /**
     * Get all companies in this workspace.
     *
     * @return HasMany<Company, $this>
     */
    public function companies(): HasMany
    {
        return $this->hasMany(Company::class);
    }

    /**
     * Get all tenants (customers) in this workspace.
     *
     * @return HasMany<Tenant, $this>
     */
    public function tenants(): HasMany
    {
        return $this->hasMany(Tenant::class);
    }

    /**
     * Get all labels in this workspace.
     *
     * @return HasMany<Label, $this>
     */
    public function labels(): HasMany
    {
        return $this->hasMany(Label::class);
    }

    /**
     * Get all tiers in this workspace.
     *
     * @return HasMany<Tier, $this>
     */
    public function tiers(): HasMany
    {
        return $this->hasMany(Tier::class);
    }

    /**
     * Get all channels in this workspace.
     *
     * @return HasMany<Channel, $this>
     */
    public function channels(): HasMany
    {
        return $this->hasMany(Channel::class);
    }

    /**
     * Get all threads in this workspace.
     *
     * @return HasMany<Thread, $this>
     */
    public function threads(): HasMany
    {
        return $this->hasMany(Thread::class);
    }

    /**
     * Get all custom field definitions in this workspace.
     *
     * @return HasMany<CustomFieldDefinition, $this>
     */
    public function customFieldDefinitions(): HasMany
    {
        return $this->hasMany(CustomFieldDefinition::class);
    }

    /**
     * Get all workflows in this workspace.
     *
     * @return HasMany<Workflow, $this>
     */
    public function workflows(): HasMany
    {
        return $this->hasMany(Workflow::class);
    }

    /**
     * Get all SLA policies in this workspace.
     *
     * @return HasMany<SlaPolicy, $this>
     */
    public function slaPolicies(): HasMany
    {
        return $this->hasMany(SlaPolicy::class);
    }

    /**
     * Get all business hours in this workspace.
     *
     * @return HasMany<BusinessHours, $this>
     */
    public function businessHours(): HasMany
    {
        return $this->hasMany(BusinessHours::class);
    }

    /**
     * Get all customer groups in this workspace.
     *
     * @return HasMany<CustomerGroup, $this>
     */
    public function customerGroups(): HasMany
    {
        return $this->hasMany(CustomerGroup::class);
    }

    /**
     * Get all snippets in this workspace.
     *
     * @return HasMany<Snippet, $this>
     */
    public function snippets(): HasMany
    {
        return $this->hasMany(Snippet::class);
    }

    /**
     * Get all tasks in this workspace.
     *
     * @return HasMany<Task, $this>
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    /**
     * Get all API keys in this workspace.
     *
     * @return HasMany<ApiKey, $this>
     */
    public function apiKeys(): HasMany
    {
        return $this->hasMany(ApiKey::class);
    }

    /**
     * Get all webhooks in this workspace.
     *
     * @return HasMany<Webhook, $this>
     */
    public function webhooks(): HasMany
    {
        return $this->hasMany(Webhook::class);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_personal' => 'boolean',
            'settings' => 'array',
        ];
    }

    /**
     * Get the public URL for the team's logo, if one has been uploaded.
     */
    public function logoUrl(): ?string
    {
        return $this->getFirstMediaUrl('logo') ?: null;
    }

    /**
     * Get the route key for the model.
     */
    public function getRouteKeyName(): string
    {
        return 'slug';
    }
}
