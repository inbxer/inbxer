<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('business_hours', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('timezone');
            $table->json('schedule');
            $table->json('holidays')->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->index('team_id');
        });

        Schema::create('sla_policies', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('tier_id')->nullable()->constrained('tiers')->nullOnDelete();
            $table->string('type')->default('first_response');
            $table->unsignedInteger('minutes')->default(60);
            $table->unsignedInteger('notify_before_minutes')->nullable();
            $table->boolean('notify_on_breach')->default(false);
            $table->boolean('only_business_hours')->default(false);
            $table->json('priorities')->nullable();
            $table->boolean('require_all_labels')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['team_id', 'is_active']);
        });

        Schema::create('sla_policy_conditions', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('sla_policy_id')->constrained('sla_policies')->cascadeOnDelete();
            $table->string('condition_type');
            $table->ulid('condition_id');
            $table->timestamp('created_at')->nullable();

            $table->index(['sla_policy_id', 'condition_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sla_policy_conditions');
        Schema::dropIfExists('sla_policies');
        Schema::dropIfExists('business_hours');
    }
};
