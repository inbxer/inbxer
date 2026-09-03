<?php

use App\Domain\Channel\Controllers\Api\ChatWidgetController;
use App\Domain\Channel\Controllers\Api\InboundEmailWebhookController;
use App\Domain\Channel\Controllers\Api\SlackEventController;
use App\Domain\Support\Controllers\TaskController;
use App\Domain\Tenant\Controllers\CompanyController;
use App\Domain\Tenant\Controllers\TenantController;
use App\Domain\Thread\Controllers\ThreadController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider or bootstrap/app.php
| within a "api" middleware group.
|
*/

Route::middleware('auth.api_key')->prefix('v1')->group(function () {
    // Threads API
    Route::apiResource('threads', ThreadController::class)->names('api.threads');
    Route::post('threads/{thread}/timeline', [ThreadController::class, 'addTimelineEntry']);

    // Customers (Tenants) API
    Route::apiResource('tenants', TenantController::class)->names('api.tenants');

    // Companies API
    Route::apiResource('companies', CompanyController::class)->names('api.companies');

    // Tasks API
    Route::apiResource('tasks', TaskController::class)->names('api.tasks');
});

// Inbound Webhooks API (Public webhook endpoints)
Route::post('v1/webhooks/email/inbound', [InboundEmailWebhookController::class, 'handle']);
Route::post('v1/webhooks/slack/events', SlackEventController::class)->middleware('throttle:120,1');

// Public Chat Widget API (embeddable widget, unauthenticated by design — scoped by app_id + visitor_id)
Route::prefix('v1/chat/{appId}')->middleware('throttle:60,1')->group(function () {
    Route::get('init', [ChatWidgetController::class, 'init']);
    Route::get('conversations', [ChatWidgetController::class, 'conversations']);
    Route::post('start', [ChatWidgetController::class, 'start']);
    Route::get('threads/{externalId}/messages', [ChatWidgetController::class, 'messages']);
    Route::post('threads/{externalId}/messages', [ChatWidgetController::class, 'reply']);
});
