<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_groups', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('color', 7)->nullable();
            $table->timestamps();

            $table->unique(['team_id', 'name']);
        });

        Schema::create('customer_group_members', function (Blueprint $table) {
            $table->foreignUlid('customer_group_id')->constrained('customer_groups')->cascadeOnDelete();
            $table->foreignUlid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();

            $table->primary(['customer_group_id', 'tenant_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_group_members');
        Schema::dropIfExists('customer_groups');
    }
};
