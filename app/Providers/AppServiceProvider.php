<?php

namespace App\Providers;

use App\Domain\Ai\Observers\AiActivityObserver;
use App\Domain\Shared\TeamContext;
use App\Domain\Support\Observers\ThreadAutoResponseObserver;
use App\Domain\Support\Observers\ThreadCsatObserver;
use App\Domain\Tenant\Models\Tenant;
use App\Domain\Thread\Models\Thread;
use App\Domain\Thread\Models\ThreadTimelineEntry;
use App\Domain\Workflow\Observers\TenantWorkflowObserver;
use App\Domain\Workflow\Observers\ThreadTimelineEntryWorkflowObserver;
use App\Domain\Workflow\Observers\ThreadWorkflowObserver;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(TeamContext::class, function () {
            return new TeamContext;
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (request()->hasHeader('x-forwarded-proto') && request()->header('x-forwarded-proto') === 'https' || str_starts_with((string) config('app.url'), 'https://')) {
            URL::forceScheme('https');
        }

        $this->configureDefaults();

        Thread::observe(ThreadWorkflowObserver::class);
        Thread::observe(ThreadAutoResponseObserver::class);
        Thread::observe(ThreadCsatObserver::class);
        ThreadTimelineEntry::observe(ThreadTimelineEntryWorkflowObserver::class);
        ThreadTimelineEntry::observe(AiActivityObserver::class);
        Tenant::observe(TenantWorkflowObserver::class);
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
