<?php

use App\Domain\Team\Models\TeamInvitation;
use Illuminate\Support\Facades\Schedule;

Schedule::call(function () {
    TeamInvitation::query()
        ->whereNotNull('expires_at')
        ->where('expires_at', '<', now())
        ->delete();
})->daily()->description('Delete expired team invitations');

Schedule::command('inbxer:auto-close-waiting-threads')
    ->hourly()
    ->description('Move waiting-for-customer threads to Done per team workflow settings');

Schedule::command('inbxer:sync-away-mode')
    ->everyFifteenMinutes()
    ->description("Sync agents' away status with their team's business hours");

Schedule::command('inbxer:check-sla-breaches')
    ->everyFiveMinutes()
    ->description('Detect SLA breaches and fire the SLA-breached workflow trigger');

Schedule::command('inbxer:sync-mintlify-docs')
    ->daily()
    ->description("Refresh each team's cached Mintlify Help Center article index");

Schedule::command('inbxer:sync-knowledge-sources')
    ->daily()
    ->description("Refresh each team's cached generic knowledge sources (sitemaps and URLs)");
