<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('knowledge_articles', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('knowledge_source_id')->constrained('knowledge_sources')->cascadeOnDelete();
            $table->string('title');
            $table->string('url');
            $table->text('content_excerpt')->nullable();
            $table->timestamps();

            $table->unique(['knowledge_source_id', 'url']);
            $table->index(['team_id', 'title']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('knowledge_articles');
    }
};
