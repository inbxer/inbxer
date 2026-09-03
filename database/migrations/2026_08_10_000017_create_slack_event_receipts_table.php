<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('slack_event_receipts', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('event_id')->unique();
            $table->string('slack_team_id')->index();
            $table->timestamp('processed_at')->nullable();
            $table->text('error')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('slack_event_receipts');
    }
};
