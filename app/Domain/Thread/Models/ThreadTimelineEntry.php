<?php

namespace App\Domain\Thread\Models;

use App\Domain\Thread\Enums\ActorType;
use App\Domain\Thread\Enums\TimelineEntryType;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

/**
 * Unified timeline entry for threads. Represents messages, notes, and
 * all system events in a single chronological stream.
 *
 * @property string $id
 * @property string $thread_id
 * @property ActorType $actor_type
 * @property string|null $actor_id
 * @property TimelineEntryType $entry_type
 * @property string|null $body
 * @property string|null $body_html
 * @property array<string, mixed>|null $metadata
 * @property bool $is_internal
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Thread $thread
 * @property-read array<int, array{name: string, url: string, mime_type: string, size: string}> $attachments
 */
class ThreadTimelineEntry extends Model implements HasMedia
{
    use HasUlids, InteractsWithMedia;

    /** @var list<string> */
    protected $fillable = [
        'thread_id',
        'actor_type',
        'actor_id',
        'entry_type',
        'body',
        'body_html',
        'metadata',
        'is_internal',
    ];

    /** @var list<string> */
    protected $appends = [
        'attachments',
    ];

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('attachments');
    }

    /**
     * @return array<int, array{name: string, url: string, mime_type: string, size: string}>
     */
    public function getAttachmentsAttribute(): array
    {
        return $this->getMedia('attachments')
            ->map(fn (Media $media) => [
                'name' => $media->name,
                'url' => $media->getUrl(),
                'mime_type' => $media->mime_type,
                'size' => $media->size < 1024 * 1024
                    ? round($media->size / 1024, 1).' KB'
                    : round($media->size / (1024 * 1024), 1).' MB',
            ])
            ->values()
            ->all();
    }

    /**
     * Get the thread this entry belongs to.
     *
     * @return BelongsTo<Thread, $this>
     */
    public function thread(): BelongsTo
    {
        return $this->belongsTo(Thread::class);
    }

    /**
     * Determine if this entry is a customer-facing message.
     */
    public function isMessage(): bool
    {
        return $this->entry_type === TimelineEntryType::Message && ! $this->is_internal;
    }

    /**
     * Determine if this entry is an internal note.
     */
    public function isNote(): bool
    {
        return $this->entry_type === TimelineEntryType::Note || $this->is_internal;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'actor_type' => ActorType::class,
            'entry_type' => TimelineEntryType::class,
            'metadata' => 'array',
            'is_internal' => 'boolean',
        ];
    }
}
