<?php

namespace App\Domain\CustomField\Enums;

enum CustomFieldType: string
{
    case Text = 'text';
    case Number = 'number';
    case Boolean = 'boolean';
    case Date = 'date';
    case Enum = 'enum';
    case Url = 'url';
    case Email = 'email';

    /**
     * Get the display label for the field type.
     */
    public function label(): string
    {
        return match ($this) {
            self::Text => 'Text',
            self::Number => 'Number',
            self::Boolean => 'Yes/No',
            self::Date => 'Date',
            self::Enum => 'Dropdown',
            self::Url => 'URL',
            self::Email => 'Email',
        };
    }

    /**
     * Get the value column name used in custom_field_values table.
     */
    public function valueColumn(): string
    {
        return match ($this) {
            self::Text, self::Url, self::Email, self::Enum => 'value_text',
            self::Number => 'value_number',
            self::Boolean => 'value_boolean',
            self::Date => 'value_date',
        };
    }

    /**
     * Get the Laravel validation rule for this field type.
     */
    public function validationRule(): string
    {
        return match ($this) {
            self::Text => 'string|max:65535',
            self::Number => 'numeric',
            self::Boolean => 'boolean',
            self::Date => 'date',
            self::Enum => 'string',
            self::Url => 'url|max:2048',
            self::Email => 'email|max:255',
        };
    }
}
