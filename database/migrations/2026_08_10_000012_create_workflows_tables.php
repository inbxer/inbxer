<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workflows', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('status')->default('draft');
            $table->string('trigger_type');
            $table->json('trigger_conditions')->nullable();
            $table->boolean('is_enabled')->default(false);
            $table->timestamp('last_triggered_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['team_id', 'status']);
            $table->index(['team_id', 'trigger_type']);
        });

        Schema::create('workflow_steps', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('workflow_id')->constrained('workflows')->cascadeOnDelete();
            $table->string('type');
            $table->string('action_type');
            $table->json('config')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->foreignUlid('parent_step_id')->nullable()->constrained('workflow_steps')->cascadeOnDelete();
            $table->string('branch')->nullable();
            $table->timestamps();

            $table->index(['workflow_id', 'position']);
        });

        Schema::create('workflow_runs', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('workflow_id')->constrained('workflows')->cascadeOnDelete();
            $table->foreignUlid('thread_id')->nullable()->constrained('threads')->nullOnDelete();
            $table->foreignUlid('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->string('status')->default('running');
            $table->timestamp('started_at');
            $table->timestamp('completed_at')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index(['workflow_id', 'status']);
            $table->index(['workflow_id', 'started_at']);
        });

        Schema::create('workflow_run_logs', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('run_id')->constrained('workflow_runs')->cascadeOnDelete();
            $table->foreignUlid('step_id')->nullable()->constrained('workflow_steps')->nullOnDelete();
            $table->string('status');
            $table->json('input')->nullable();
            $table->json('output')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('executed_at');
            $table->timestamp('created_at')->nullable();

            $table->index(['run_id', 'executed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workflow_run_logs');
        Schema::dropIfExists('workflow_runs');
        Schema::dropIfExists('workflow_steps');
        Schema::dropIfExists('workflows');
    }
};
