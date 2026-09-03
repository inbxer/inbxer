<?php

namespace App\Domain\Support\Controllers;

use App\Domain\Channel\Enums\ChannelType;
use App\Domain\Channel\Models\Channel;
use App\Domain\Label\Models\Label;
use App\Domain\Shared\TeamContext;
use App\Domain\Support\Models\AutoResponse;
use App\Domain\Team\Models\Team;
use App\Domain\Thread\Enums\ThreadPriority;
use App\Domain\Thread\Enums\ThreadStatus;
use App\Domain\Tier\Models\Tier;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AutoResponseController extends Controller
{
    /**
     * List all auto-responses for the team.
     */
    public function index(Request $request): Response
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team, 403);

        app(TeamContext::class)->set($team);

        return Inertia::render('settings/auto-responses', [
            'autoResponses' => AutoResponse::where('team_id', $team->id)
                ->orderBy('position')
                ->get(['id', 'name', 'message', 'channels', 'is_enabled']),
            'channelOptions' => $this->channelOptions($team),
        ]);
    }

    /**
     * Create a new draft auto-response and redirect to its edit page.
     */
    public function store(Request $request): RedirectResponse
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team, 403);

        app(TeamContext::class)->set($team);

        $position = AutoResponse::where('team_id', $team->id)->max('position') ?? -1;

        $autoResponse = AutoResponse::create([
            'team_id' => $team->id,
            'name' => 'New autoresponse',
            'message' => 'We will get back to you as soon as possible.',
            'channels' => array_column($this->channelOptions($team), 'value'),
            'conditions' => ['logic' => 'and', 'conditions' => []],
            'position' => $position + 1,
            'is_enabled' => false,
        ]);

        return redirect()->route('settings.autoresponses.show', [
            'autoResponse' => $autoResponse->id,
        ]);
    }

    /**
     * Display the edit page for a single auto-response.
     */
    public function show(Request $request, AutoResponse $autoResponse): Response
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team && $autoResponse->team_id === $team->id, 403);

        app(TeamContext::class)->set($team);

        return Inertia::render('settings/auto-response-edit', [
            'autoResponse' => [
                'id' => $autoResponse->id,
                'name' => $autoResponse->name,
                'message' => $autoResponse->message,
                'channels' => $autoResponse->channels ?? [],
                'conditions' => $autoResponse->conditions ?? ['logic' => 'and', 'conditions' => []],
                'is_enabled' => $autoResponse->is_enabled,
                'respect_business_hours' => $autoResponse->respect_business_hours,
            ],
            'channelOptions' => $this->channelOptions($team),
            'conditionFields' => $this->conditionFields($team),
        ]);
    }

    /**
     * Save an auto-response's settings.
     */
    public function update(Request $request, AutoResponse $autoResponse): RedirectResponse
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team && $autoResponse->team_id === $team->id, 403);

        app(TeamContext::class)->set($team);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'message' => 'required|string',
            'channels' => 'nullable|array',
            'conditions' => 'nullable|array',
            'is_enabled' => 'boolean',
            'respect_business_hours' => 'boolean',
        ]);

        $autoResponse->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Auto-response saved.']);

        return redirect()->back();
    }

    /**
     * Toggle an auto-response's enabled state from the list page.
     */
    public function toggle(Request $request, AutoResponse $autoResponse): RedirectResponse
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team && $autoResponse->team_id === $team->id, 403);

        app(TeamContext::class)->set($team);

        $autoResponse->update(['is_enabled' => ! $autoResponse->is_enabled]);

        return redirect()->back();
    }

    public function destroy(Request $request, AutoResponse $autoResponse): RedirectResponse
    {
        $team = $request->user()?->currentTeam;
        abort_unless($team instanceof Team && $autoResponse->team_id === $team->id, 403);

        app(TeamContext::class)->set($team);

        $autoResponse->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Auto-response deleted.']);

        return redirect()->route('settings.autoresponses.index');
    }

    /**
     * Channel types the team has actually connected and enabled.
     *
     * @return array<int, array{value: string, label: string}>
     */
    private function channelOptions(Team $team): array
    {
        $activeTypes = Channel::where('team_id', $team->id)
            ->where('is_active', true)
            ->pluck('type')
            ->unique();

        return $activeTypes
            ->map(fn (ChannelType $type) => ['value' => $type->value, 'label' => $type->label()])
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function conditionFields(Team $team): array
    {
        return [
            'fields' => [
                ['value' => 'status', 'label' => 'Status', 'type' => 'select', 'multiple' => true],
                ['value' => 'priority', 'label' => 'Priority', 'type' => 'select', 'multiple' => true],
                ['value' => 'tier', 'label' => 'Tier', 'type' => 'select', 'multiple' => true],
                ['value' => 'label', 'label' => 'Labels', 'type' => 'select', 'multiple' => true],
                ['value' => 'title_contains', 'label' => 'Title contains', 'type' => 'text', 'multiple' => false],
            ],
            'operators' => [
                ['value' => 'is', 'label' => 'Is'],
                ['value' => 'is_not', 'label' => 'Is not'],
                ['value' => 'contains', 'label' => 'Contains'],
                ['value' => 'not_contains', 'label' => 'Does not contain'],
            ],
            'statuses' => array_map(fn (ThreadStatus $s) => ['value' => $s->value, 'label' => $s->label()], ThreadStatus::cases()),
            'priorities' => array_map(fn (ThreadPriority $p) => ['value' => $p->value, 'label' => ucfirst($p->value)], ThreadPriority::cases()),
            'tiers' => Tier::where('team_id', $team->id)->orderBy('name')->get(['id', 'name'])
                ->map(fn (Tier $tier) => ['value' => $tier->id, 'label' => $tier->name])->values()->all(),
            'labels' => Label::where('team_id', $team->id)->orderBy('name')->get(['id', 'name'])
                ->map(fn (Label $label) => ['value' => $label->id, 'label' => $label->name])->values()->all(),
        ];
    }
}
