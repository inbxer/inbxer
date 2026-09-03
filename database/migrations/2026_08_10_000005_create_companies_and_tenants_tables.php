<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('companies', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->string('domain')->nullable();
            $table->string('logo_url')->nullable();
            $table->foreignUlid('tier_id')->nullable()->constrained('tiers')->nullOnDelete();
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('contract_value')->nullable()->default(0);
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['team_id', 'slug']);
            $table->index(['team_id', 'domain']);
        });

        Schema::create('tenants', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('company_id')->nullable()->constrained('companies')->nullOnDelete();
            $table->foreignUlid('tier_id')->nullable()->constrained('tiers')->nullOnDelete();
            $table->string('external_id')->nullable();
            $table->string('name');
            $table->string('email');
            $table->string('avatar_url')->nullable();
            $table->string('phone')->nullable();
            $table->string('timezone')->nullable();
            $table->string('locale')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['team_id', 'email']);
            $table->index(['team_id', 'external_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
        Schema::dropIfExists('companies');
    }
};
