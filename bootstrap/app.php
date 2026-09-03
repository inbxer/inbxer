<?php

use App\Domain\HelpCenter\Console\Commands\SyncKnowledgeSourcesCommand;
use App\Domain\HelpCenter\Console\Commands\SyncMintlifyDocsCommand;
use App\Domain\Sla\Console\Commands\CheckSlaBreachesCommand;
use App\Domain\Team\Console\Commands\SyncAwayModeFromBusinessHoursCommand;
use App\Domain\Team\Middleware\SetTeamUrlDefaults;
use App\Domain\Thread\Console\Commands\AutoCloseWaitingThreadsCommand;
use App\Http\Middleware\AuthenticateApiKey;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withCommands([
        AutoCloseWaitingThreadsCommand::class,
        SyncAwayModeFromBusinessHoursCommand::class,
        CheckSlaBreachesCommand::class,
        SyncMintlifyDocsCommand::class,
        SyncKnowledgeSourcesCommand::class,
    ])
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            SetTeamUrlDefaults::class,
        ]);

        $middleware->alias([
            'auth.api_key' => AuthenticateApiKey::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
