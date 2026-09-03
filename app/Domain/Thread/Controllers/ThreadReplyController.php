<?php

namespace App\Domain\Thread\Controllers;

use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Jobs\SendOutboundEmailReplyJob;
use App\Domain\Channel\Jobs\SendOutboundSlackReplyJob;
use App\Domain\Shared\TeamContext;
use App\Domain\Team\Enums\TeamPermission;
use App\Domain\Tenant\Models\Customer;
use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Thread\Enums\TimelineEntryType;
use App\Domain\Thread\Events\ThreadMessageBroadcast;
use App\Domain\Thread\Models\Thread;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ThreadReplyController extends Controller
{
    /**
     * Submit a reply or internal note.
     */
    public function __invoke(Request $request, Thread $thread): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            abort(403);
        }

        app(TeamContext::class)->set($team);

        $validated = $request->validate([
            'body' => 'required|string',
            'is_internal' => 'required|boolean',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|max:10240',
            'status' => ['nullable', 'string', Rule::enum(ThreadStatus::class)],
        ]);

        $requiredPermission = $validated['is_internal']
            ? TeamPermission::ParticipateInternalDiscussions
            : TeamPermission::MessageCustomers;

        abort_unless(
            $user->hasTeamPermission($team, $requiredPermission),
            403,
            $validated['is_internal']
                ? 'Your role cannot post internal notes.'
                : 'Your role cannot send messages to customers.',
        );

        $entry = $thread->timelineEntries()->create([
            'actor_type' => ActorType::User,
            'actor_id' => (string) $user->id,
            'entry_type' => $validated['is_internal'] ? TimelineEntryType::Note : TimelineEntryType::Message,
            'body' => $validated['body'],
            'is_internal' => $validated['is_internal'],
        ]);

        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                if ($file->isValid()) {
                    $entry->addMedia($file)
                        ->usingName($file->getClientOriginalName())
                        ->toMediaCollection('attachments');
                }
            }
        }

        if (! empty($validated['status'])) {
            $thread->status = ThreadStatus::from($validated['status']);
        }

        // A human agent has taken over — the AI stops staying quiet on this
        // thread (see AiDispatcher::dispatchFor's ai_handoff_at check).
        if (! $validated['is_internal'] && $thread->ai_handoff_at !== null) {
            $thread->ai_handoff_at = null;
        }

        $thread->touch();
        $thread->save();

        ThreadMessageBroadcast::dispatch($entry);

        if (! $validated['is_internal'] && $thread->channel?->type === ChannelType::Slack) {
            SendOutboundSlackReplyJob::dispatch($thread->id, $entry->id);
        }

        // Dispatch outbound email reply job if external message and customer has email
        $recipientEmail = $thread->tenant->email
            ?? Tenant::withoutGlobalScopes()->find($thread->tenant_id)->email
            ?? Customer::where('team_id', $team->id)->where('tenant_id', $thread->tenant_id)->value('email');

        if (! $validated['is_internal'] && $recipientEmail && ! in_array($thread->channel?->type, [ChannelType::Slack, ChannelType::Chat], true)) {
            SendOutboundEmailReplyJob::dispatch(
                $thread->id,
                $entry->id,
                $recipientEmail
            );
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Message posted.']);

        return redirect()->back();
    }
}
