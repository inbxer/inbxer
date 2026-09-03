<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_settings', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();

            $table->string('mode')->default('shadow');
            $table->string('public_name')->default('Inbi');
            $table->boolean('send_handoff_message')->default(true);
            $table->boolean('include_inline_links')->default(true);
            $table->boolean('show_knowledge_citations')->default(true);
            $table->text('custom_instructions')->nullable();
            $table->json('tone_rules')->nullable();
            $table->json('channels')->nullable();
            $table->boolean('respect_business_hours')->default(false);
            $table->string('model')->default('gemini-3.5-flash-lite');
            $table->float('temperature')->default(0.3);

            $table->boolean('auto_labeling_enabled')->default(false);
            $table->boolean('urgency_detection_enabled')->default(false);
            $table->boolean('thread_titles_enabled')->default(false);
            $table->boolean('thread_catchups_enabled')->default(false);
            $table->boolean('similar_threads_enabled')->default(false);
            $table->boolean('suggested_responses_enabled')->default(false);

            $table->timestamps();

            $table->unique('team_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_settings');
    }
};
