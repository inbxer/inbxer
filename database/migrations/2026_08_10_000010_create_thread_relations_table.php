<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('thread_relations', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('thread_id')->constrained('threads')->cascadeOnDelete();
            $table->foreignUlid('related_thread_id')->constrained('threads')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['thread_id', 'related_thread_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('thread_relations');
    }
};
