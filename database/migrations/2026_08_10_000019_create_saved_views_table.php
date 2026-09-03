<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('saved_views', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->json('filters')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
            $table->index(['team_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_views');
    }
};
