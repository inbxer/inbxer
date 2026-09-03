<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('threads', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('sequence_number')->default(1);
            $table->foreignUlid('channel_id')->nullable()->constrained('channels')->nullOnDelete();
            $table->foreignUlid('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUlid('tier_id')->nullable()->constrained('tiers')->nullOnDelete();
            $table->string('priority')->default('normal');
            $table->string('status')->default('needs_first_response');
            $table->timestamp('status_changed_at')->nullable();
            $table->string('title')->nullable();
            $table->string('external_id')->nullable();
            $table->timestamp('snoozed_until')->nullable();
            $table->timestamp('first_response_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('sla_first_response_breached_at')->nullable();
            $table->timestamp('sla_next_response_breached_at')->nullable();
            $table->timestamp('sla_first_response_notified_at')->nullable();
            $table->timestamp('sla_next_response_notified_at')->nullable();
            $table->timestamp('locked_at')->nullable();
            $table->timestamp('ai_handoff_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['team_id', 'status']);
            $table->index(['team_id', 'priority']);
            $table->index(['team_id', 'assigned_to']);
            $table->index(['team_id', 'tenant_id']);
            $table->index(['team_id', 'created_at']);
            $table->index(['team_id', 'external_id']);
            $table->index(['team_id', 'sequence_number']);
        });

        Schema::create('thread_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('thread_id')->constrained('threads')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->foreignUlid('tenant_id')->nullable()->constrained('tenants')->cascadeOnDelete();
            $table->string('role');
            $table->timestamps();

            $table->index(['thread_id', 'role']);
        });

        Schema::create('thread_labels', function (Blueprint $table) {
            $table->foreignUlid('thread_id')->constrained('threads')->cascadeOnDelete();
            $table->foreignUlid('label_id')->constrained('labels')->cascadeOnDelete();
            $table->timestamp('created_at')->nullable();

            $table->primary(['thread_id', 'label_id']);
        });

        Schema::create('thread_timeline_entries', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('thread_id')->constrained('threads')->cascadeOnDelete();
            $table->string('actor_type');
            $table->ulid('actor_id')->nullable();
            $table->string('entry_type');
            $table->text('body')->nullable();
            $table->text('body_html')->nullable();
            $table->json('metadata')->nullable();
            $table->boolean('is_internal')->default(false);
            $table->timestamps();

            $table->index(['thread_id', 'created_at']);
            $table->index(['thread_id', 'entry_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('thread_timeline_entries');
        Schema::dropIfExists('thread_labels');
        Schema::dropIfExists('thread_participants');
        Schema::dropIfExists('threads');
    }
};
