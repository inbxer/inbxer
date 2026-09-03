<?php

namespace App\Domain\Thread\Controllers;

use App\Domain\CustomField\Models\CustomFieldDefinition;
use App\Domain\CustomField\Models\CustomFieldValue;
use App\Domain\Shared\Enums\EntityType;
use App\Domain\Thread\Models\Thread;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ThreadCustomFieldController extends Controller
{
    /**
     * Save thread custom field values.
     */
    public function __invoke(Request $request, Thread $thread): RedirectResponse
    {
        $validated = $request->validate([
            'fields' => 'required|array',
            'fields.*.definition_id' => 'required|exists:custom_field_definitions,id',
            'fields.*.value' => 'nullable',
        ]);

        foreach ($validated['fields'] as $field) {
            $definition = CustomFieldDefinition::find($field['definition_id']);
            if (! $definition instanceof CustomFieldDefinition) {
                continue;
            }

            $col = $definition->field_type->valueColumn();

            CustomFieldValue::updateOrCreate([
                'definition_id' => $definition->id,
                'entity_type' => EntityType::Thread,
                'entity_id' => $thread->id,
            ], [
                $col => $field['value'],
            ]);
        }

        return redirect()->back();
    }
}
