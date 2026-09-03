<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auto_responses', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('message');
            $table->json('channels')->nullable();
            $table->json('conditions')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->boolean('is_enabled')->default(false);
            $table->boolean('respect_business_hours')->default(false);
            $table->timestamps();

            $table->index(['team_id', 'is_enabled', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auto_responses');
    }
};
