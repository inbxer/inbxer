<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('custom_field_definitions', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->string('entity_type');
            $table->string('key');
            $table->string('label');
            $table->string('field_type');
            $table->string('description')->nullable();
            $table->boolean('is_required')->default(false);
            $table->unsignedInteger('position')->default(0);
            $table->json('options')->nullable();
            $table->string('default_value')->nullable();
            $table->timestamps();

            $table->unique(['team_id', 'entity_type', 'key']);
        });

        Schema::create('custom_field_values', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('definition_id')->constrained('custom_field_definitions')->cascadeOnDelete();
            $table->string('entity_type');
            $table->ulid('entity_id');
            $table->text('value_text')->nullable();
            $table->decimal('value_number', 20, 6)->nullable();
            $table->boolean('value_boolean')->nullable();
            $table->date('value_date')->nullable();
            $table->timestamps();

            $table->unique(['definition_id', 'entity_type', 'entity_id']);
            $table->index(['entity_type', 'entity_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('custom_field_values');
        Schema::dropIfExists('custom_field_definitions');
    }
};
