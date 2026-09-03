<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('labels', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('color', 7);
            $table->string('icon')->nullable();
            $table->string('description')->nullable();
            $table->timestamps();

            $table->unique(['team_id', 'name']);
        });

        Schema::create('tiers', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('color', 7);
            $table->string('default_priority')->default('normal');
            $table->unsignedInteger('position')->default(0);
            $table->boolean('is_default')->default(false);
            $table->string('external_id')->nullable();
            $table->timestamps();

            $table->unique(['team_id', 'name']);
            $table->index(['team_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tiers');
        Schema::dropIfExists('labels');
    }
};
