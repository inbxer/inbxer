<?php

namespace App\Domain\CustomField\Models;

use App\Domain\CustomField\Enums\CustomFieldType;
use App\Domain\Shared\Concerns\BelongsToTeam;
use App\Domain\Shared\Enums\EntityType;
use App\Domain\Team\Models\Team;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property int $team_id
 * @property EntityType $entity_type
 * @property string $key
 * @property string $label
 * @property CustomFieldType $field_type
 * @property string|null $description
 * @property bool $is_required
 * @property int $position
 * @property array<int, array{value: string, label: string, color?: string}>|null $options
 * @property string|null $default_value
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Team $team
 * @property-read Collection<int, CustomFieldValue> $values
 */
class CustomFieldDefinition extends Model
{
    use BelongsToTeam, HasUlids;

    /** @var list<string> */
    protected $fillable = [
        'team_id',
        'entity_type',
        'key',
        'label',
        'field_type',
        'description',
        'is_required',
        'position',
        'options',
        'default_value',
    ];

    /**
     * Get all values stored for this field definition.
     *
     * @return HasMany<CustomFieldValue, $this>
     */
    public function values(): HasMany
    {
        return $this->hasMany(CustomFieldValue::class, 'definition_id');
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'entity_type' => EntityType::class,
            'field_type' => CustomFieldType::class,
            'is_required' => 'boolean',
            'position' => 'integer',
            'options' => 'array',
        ];
    }
}
