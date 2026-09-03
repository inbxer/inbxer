<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_activity_log_entries', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('thread_id')->constrained('threads')->cascadeOnDelete();

            $table->text('generated_reply');
            $table->json('matched_articles')->nullable();
            $table->string('status')->default('pending_review');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->ulid('timeline_entry_id')->nullable();

            $table->timestamps();

            $table->index(['team_id', 'status']);
            $table->index('thread_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_activity_log_entries');
    }
};
