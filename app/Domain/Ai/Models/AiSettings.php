<?php

namespace App\Domain\Ai\Models;

use App\Domain\Shared\Concerns\BelongsToTeam;
use App\Domain\Team\Models\Team;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

/**
 * A team's AI Agent configuration: reply mode (shadow vs live), tone,
 * custom instructions, and store-only automation toggles.
 *
 * @property string $id
 * @property int $team_id
 * @property string $mode
 * @property string $public_name
 * @property bool $send_handoff_message
 * @property bool $include_inline_links
 * @property bool $show_knowledge_citations
 * @property string|null $custom_instructions
 * @property array<string, string>|null $tone_rules
 * @property array<int, string>|null $channels
 * @property bool $respect_business_hours
 * @property string $model
 * @property float $temperature
 * @property bool $auto_labeling_enabled
 * @property bool $urgency_detection_enabled
 * @property bool $thread_titles_enabled
 * @property bool $thread_catchups_enabled
 * @property bool $similar_threads_enabled
 * @property bool $suggested_responses_enabled
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Team $team
 */
class AiSettings extends Model implements HasMedia
{
    use BelongsToTeam, HasUlids, InteractsWithMedia;

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('avatar')->singleFile();
    }

    /**
     * Get the public URL for the AI Agent's avatar — the team's uploaded
     * image if one exists, otherwise the site-wide default AI avatar used
     * everywhere an uploaded avatar hasn't been set.
     */
    public function avatarUrl(): string
    {
        return $this->getFirstMediaUrl('avatar') ?: asset('widget/ai-avatar.jpg');
    }

    /** @var list<string> */
    protected $fillable = [
        'team_id',
        'mode',
        'public_name',
        'send_handoff_message',
        'include_inline_links',
        'show_knowledge_citations',
        'custom_instructions',
        'tone_rules',
        'channels',
        'respect_business_hours',
        'model',
        'temperature',
        'auto_labeling_enabled',
        'urgency_detection_enabled',
        'thread_titles_enabled',
        'thread_catchups_enabled',
        'similar_threads_enabled',
        'suggested_responses_enabled',
    ];

    /**
     * Get (or lazily create) the AI settings row for the given team.
     */
    public static function forTeam(Team $team): self
    {
        return static::withoutGlobalScopes()->firstOrCreate(['team_id' => $team->id]);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'send_handoff_message' => 'boolean',
            'include_inline_links' => 'boolean',
            'show_knowledge_citations' => 'boolean',
            'tone_rules' => 'array',
            'channels' => 'array',
            'respect_business_hours' => 'boolean',
            'temperature' => 'float',
            'auto_labeling_enabled' => 'boolean',
            'urgency_detection_enabled' => 'boolean',
            'thread_titles_enabled' => 'boolean',
            'thread_catchups_enabled' => 'boolean',
            'similar_threads_enabled' => 'boolean',
            'suggested_responses_enabled' => 'boolean',
        ];
    }
}
