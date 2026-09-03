<?php

namespace App\Domain\Thread\Services;

use App\Domain\Channel\Models\Channel;
use App\Domain\Label\Models\Label;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Models\Thread;
use App\Domain\Tier\Models\Tier;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * Resolves the active thread-list queue filter from the request/route and
 * applies the corresponding constraints to a Thread query.
 */
class ThreadListingFilter
{
    /**
     * Determine which filter is active based on the request's explicit query
     * param, route, or path (queue shortcuts like /threads/yours).
     */
    public function resolve(Request $request): string
    {
        if ($filter = $request->query('filter')) {
            return $filter;
        }

        $path = $request->path();
        $routeLabel = $request->route('label');
        $routeTier = $request->route('tier');
        $routeChannel = $request->route('channel');

        if (str_contains($path, 'threads/yours')) {
            return 'my_threads';
        }

        if (str_contains($path, 'threads/unassigned')) {
            return 'unassigned';
        }

        if (str_contains($path, 'threads/all')) {
            return 'all';
        }

        if (str_contains($path, 'threads/views')) {
            return 'views';
        }

        if ($routeLabel || str_contains($path, 'threads/labels/')) {
            $lblVal = $routeLabel ?? basename($path);
            $foundLabel = Label::where('id', $lblVal)->orWhere('name', urldecode($lblVal))->first();

            return 'label:'.($foundLabel ? $foundLabel->name : urldecode($lblVal));
        }

        if ($routeTier || preg_match('#threads/ti[er]rs/([^/]+)#', $path, $m)) {
            $trVal = $routeTier ?? ($m[1] ?? basename($path));
            $foundTier = Tier::where('id', $trVal)->orWhere('name', urldecode($trVal))->first();

            return 'tier:'.($foundTier ? $foundTier->name : urldecode($trVal));
        }

        if ($routeChannel || str_contains($path, 'threads/channels/')) {
            $chnVal = $routeChannel ?? basename($path);
            $foundChannel = Channel::where('id', $chnVal)
                ->orWhere('name', urldecode($chnVal))
                ->orWhere('type', urldecode($chnVal))
                ->first();

            return 'channel:'.($foundChannel ? $foundChannel->name : urldecode($chnVal));
        }

        return 'all';
    }

    /**
     * Apply the resolved filter's constraints to the given query.
     *
     * @param  Builder<Thread>  $query
     * @return Builder<Thread>
     */
    public function apply(Builder $query, string $filter, int $userId): Builder
    {
        if ($filter === 'my_threads') {
            return $query->where('assigned_to', $userId)
                ->whereNotIn('status', [ThreadStatus::Done, ThreadStatus::Ignored, ThreadStatus::Spam]);
        }

        if ($filter === 'unassigned') {
            return $query->whereNull('assigned_to')
                ->whereNotIn('status', [ThreadStatus::Done, ThreadStatus::Ignored, ThreadStatus::Spam]);
        }

        if (str_starts_with($filter, 'user:')) {
            $assigneeId = substr($filter, 5);

            return $query->where('assigned_to', $assigneeId)
                ->whereNotIn('status', [ThreadStatus::Done, ThreadStatus::Ignored, ThreadStatus::Spam]);
        }

        if (str_starts_with($filter, 'label:')) {
            $labelName = substr($filter, 6);

            return $query->whereHas('labels', function ($q) use ($labelName) {
                $q->where('name', $labelName);
            })->whereNotIn('status', [ThreadStatus::Done, ThreadStatus::Ignored, ThreadStatus::Spam]);
        }

        if (str_starts_with($filter, 'tier:')) {
            $tierVal = urldecode(substr($filter, 5));
            $foundTier = Tier::where('name', $tierVal)
                ->orWhere('id', $tierVal)
                ->first();

            return $query->where(function ($q) use ($tierVal, $foundTier) {
                if ($foundTier) {
                    $q->where('tier_id', $foundTier->id)
                        ->orWhereHas('tenant', function ($tq) use ($foundTier) {
                            $tq->where('tier_id', $foundTier->id);
                        });
                } else {
                    $q->whereHas('tier', function ($tq) use ($tierVal) {
                        $tq->where('name', 'LIKE', "%{$tierVal}%")->orWhere('id', $tierVal);
                    })->orWhereHas('tenant', function ($tq) use ($tierVal) {
                        $tq->whereHas('tier', function ($ttq) use ($tierVal) {
                            $ttq->where('name', 'LIKE', "%{$tierVal}%")->orWhere('id', $tierVal);
                        });
                    });
                }
            })->whereNotIn('status', [ThreadStatus::Done, ThreadStatus::Ignored, ThreadStatus::Spam]);
        }

        if (str_starts_with($filter, 'channel:')) {
            $channelVal = urldecode(substr($filter, 8));
            $foundChannel = Channel::where('name', $channelVal)
                ->orWhere('id', $channelVal)
                ->orWhere('type', $channelVal)
                ->first();

            return $query->where(function ($q) use ($channelVal, $foundChannel) {
                if ($foundChannel) {
                    $q->where('channel_id', $foundChannel->id);
                } else {
                    $q->whereHas('channel', function ($cq) use ($channelVal) {
                        $cq->where('name', 'LIKE', "%{$channelVal}%")
                            ->orWhere('id', $channelVal)
                            ->orWhere('type', 'LIKE', "%{$channelVal}%");
                    })->orWhere('channel_id', $channelVal);
                }
            })->whereNotIn('status', [ThreadStatus::Done, ThreadStatus::Ignored, ThreadStatus::Spam]);
        }

        // all active threads
        return $query->whereNotIn('status', [ThreadStatus::Done, ThreadStatus::Ignored, ThreadStatus::Spam]);
    }
}
