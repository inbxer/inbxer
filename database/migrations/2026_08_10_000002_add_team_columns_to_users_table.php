<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Kept separate from the base `create_users_table` migration because these
 * columns depend on the `teams` table existing first (current_team_id's
 * foreign key), while the base users table is created before teams.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('current_team_id')
                ->nullable()
                ->after('password')
                ->constrained('teams')
                ->nullOnDelete();
            $table->boolean('is_away')->default(false)->after('current_team_id');
            $table->timestamp('away_at')->nullable()->after('is_away');
            $table->boolean('is_away_auto')->default(false)->after('away_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('current_team_id');
            $table->dropColumn(['is_away', 'away_at', 'is_away_auto']);
        });
    }
};
