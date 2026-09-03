<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('channels', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->string('name');
            $table->boolean('is_active')->default(true);
            $table->json('settings')->nullable();
            $table->timestamps();

            $table->index(['team_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('channels');
    }
};
