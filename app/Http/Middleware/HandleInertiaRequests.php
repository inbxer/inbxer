<?php

namespace App\Http\Middleware;

use App\Domain\Ai\Models\AiSettings;
use App\Domain\Channel\Models\Channel;
use App\Domain\Label\Models\Label;
use App\Domain\Shared\TeamContext;
use App\Domain\Support\Enums\TaskStatus;
use App\Domain\Support\Models\SavedView;
use App\Domain\Support\Models\Task;
use App\Domain\Support\Models\UserFavorite;
use App\Domain\Team\Enums\TeamRole;
use App\Domain\Team\Models\Membership;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Models\Thread;
use App\Domain\Tier\Models\Tier;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $sidebarStats = null;
        $ai = null;

        if ($user && $user->currentTeam) {
            $team = $user->currentTeam;

            // Set TeamContext so global multi-tenancy query scope is active
            app(TeamContext::class)->set($team);

            // Fetch counts
            $myThreadsCount = Thread::where('assigned_to', $user->id)
                ->whereNotIn('status', [ThreadStatus::Done, ThreadStatus::Ignored, ThreadStatus::Spam])
                ->count();

            $tasksCount = Task::where('assigned_to', $user->id)
                ->where('status', TaskStatus::Open)
                ->count();

            $allThreadsCount = Thread::whereNotIn('status', [ThreadStatus::Done, ThreadStatus::Ignored, ThreadStatus::Spam])
                ->count();

            $notAssignedCount = Thread::whereNull('assigned_to')
                ->whereNotIn('status', [ThreadStatus::Done, ThreadStatus::Ignored, ThreadStatus::Spam])
                ->count();

            // Labels with counts
            $labels = Label::withCount(['threads' => function ($query) {
                $query->whereNotIn('status', [ThreadStatus::Done, ThreadStatus::Ignored, ThreadStatus::Spam]);
            }])->get()->map(fn ($label) => [
                'id' => $label->id,
                'name' => $label->name,
                'color' => $label->color,
                'icon' => $label->icon,
                'threads_count' => $label->threads_count,
            ]);

            // Tiers with counts
            $tiers = Tier::get()->map(fn ($tier) => [
                'id' => $tier->id,
                'name' => $tier->name,
                'color' => $tier->color,
                'threads_count' => Thread::where('tier_id', $tier->id)->whereNotIn('status', [ThreadStatus::Done, ThreadStatus::Ignored, ThreadStatus::Spam])->count(),
            ]);

            // Channels with counts
            $channels = Channel::withCount(['threads' => function ($query) {
                $query->whereNotIn('status', [ThreadStatus::Done, ThreadStatus::Ignored, ThreadStatus::Spam]);
            }])->get()->map(fn ($channel) => [
                'id' => $channel->id,
                'name' => $channel->name,
                'type' => $channel->type->value,
                'icon' => $channel->type->icon(),
                'threads_count' => $channel->threads_count,
            ]);

            // Saved Views
            $savedViews = SavedView::where('team_id', $team->id)
                ->orderBy('position')
                ->get(['id', 'name', 'filters']);

            $savedViewsPermission = $team->settings['workflow']['saved_views']['manage_permission'] ?? 'everyone';
            $canManageSavedViews = $savedViewsPermission === 'everyone'
                || (Membership::where('team_id', $team->id)->where('user_id', $user->id)->first()?->role->isAtLeast(TeamRole::Admin) ?? false);

            // User Favorites from Database
            $favorites = UserFavorite::where('user_id', $user->id)
                ->where('team_id', $team->id)
                ->get()
                ->map(fn ($fav) => [
                    'id' => $fav->filter_key,
                    'filter_key' => $fav->filter_key,
                    'title' => $fav->title,
                    'url' => $fav->url,
                ]);

            $sidebarStats = [
                'my_threads_count' => $myThreadsCount,
                'tasks_count' => $tasksCount,
                'all_threads_count' => $allThreadsCount,
                'not_assigned_count' => $notAssignedCount,
                'labels' => $labels,
                'tiers' => $tiers,
                'channels' => $channels,
                'favorites' => $favorites,
                'savedViews' => $savedViews,
                'canManageSavedViews' => $canManageSavedViews,
            ];

            $aiSettings = AiSettings::forTeam($team);

            $ai = [
                'suggested_responses_enabled' => $aiSettings->suggested_responses_enabled,
                'thread_catchups_enabled' => $aiSettings->thread_catchups_enabled,
                'similar_threads_enabled' => $aiSettings->similar_threads_enabled,
            ];
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'currentTeam' => fn () => $user?->currentTeam ? $user->toUserTeam($user->currentTeam) : null,
            'teams' => fn () => $user?->toUserTeams(includeCurrent: true) ?? [],
            'sidebarStats' => $sidebarStats,
            'ai' => $ai,
        ];
    }
}
