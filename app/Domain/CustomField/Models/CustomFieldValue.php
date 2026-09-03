<?php

namespace App\Domain\CustomField\Models;

use App\Domain\Shared\Enums\EntityType;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;

/**
 * Stores the actual value of a custom field for a specific entity.
 * Uses typed columns (value_text, value_number, etc.) for database-level
 * filtering and sorting — not a single JSON blob.
 *
 * @property string $id
 * @property string $definition_id
 * @property EntityType $entity_type
 * @property string $entity_id
 * @property string|null $value_text
 * @property float|null $value_number
 * @property bool|null $value_boolean
 * @property Carbon|null $value_date
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read CustomFieldDefinition $definition
 * @property-read Model $entity
 */
class CustomFieldValue extends Model
{
    use HasUlids;

    /** @var list<string> */
    protected $fillable = [
        'definition_id',
        'entity_type',
        'entity_id',
        'value_text',
        'value_number',
        'value_boolean',
        'value_date',
    ];

    /**
     * Get the field definition this value belongs to.
     *
     * @return BelongsTo<CustomFieldDefinition, $this>
     */
    public function definition(): BelongsTo
    {
        return $this->belongsTo(CustomFieldDefinition::class, 'definition_id');
    }

    /**
     * Get the entity that owns this custom field value.
     *
     * @return MorphTo<Model, $this>
     */
    public function entity(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Get the resolved value based on the field type.
     */
    public function resolvedValue(): mixed
    {
        $column = $this->definition->field_type->valueColumn();

        return $this->{$column};
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
            'value_number' => 'decimal:6',
            'value_boolean' => 'boolean',
            'value_date' => 'date',
        ];
    }
}
