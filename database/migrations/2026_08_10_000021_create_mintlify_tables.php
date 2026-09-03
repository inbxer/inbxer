<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mintlify_connections', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->string('site_url');
            $table->json('settings')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();

            $table->unique('team_id');
        });

        Schema::create('mintlify_articles', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('mintlify_connection_id')->constrained('mintlify_connections')->cascadeOnDelete();
            $table->string('title');
            $table->string('url');
            $table->text('content_excerpt')->nullable();
            $table->timestamps();

            $table->unique(['mintlify_connection_id', 'url']);
            $table->index(['team_id', 'title']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mintlify_articles');
        Schema::dropIfExists('mintlify_connections');
    }
};
