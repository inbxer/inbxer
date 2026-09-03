<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_favorites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->string('filter_key');
            $table->string('title');
            $table->string('url');
            $table->timestamps();

            $table->unique(['user_id', 'team_id', 'filter_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_favorites');
    }
};
