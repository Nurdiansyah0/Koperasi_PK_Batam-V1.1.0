<?php

namespace App\Providers;

use Illuminate\Console\Events\CommandStarting;
use Illuminate\Routing\Events\RouteMatched;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Laravel\Nightwatch\Facades\Nightwatch;
use Laravel\Nightwatch\Records\OutgoingRequest;
use Laravel\Nightwatch\Records\Query;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureNightwatch();
    }

    /**
     * Configure Laravel Nightwatch sampling, filtering, and data redaction.
     */
    private function configureNightwatch(): void
    {
        Event::listen(function (CommandStarting $event): void {
            if (in_array($event->command, ['nightwatch:agent', 'nightwatch:status', 'schedule:finish', 'package:discover'], true)) {
                Nightwatch::dontSample();
            }
        });

        Event::listen(function (RouteMatched $event): void {
            if (in_array($event->route->uri(), ['up', 'laravel/api/v1/ping'], true)) {
                Nightwatch::dontSample();
            }
        });

        Nightwatch::rejectQueries(function (Query $query): bool {
            return str_contains($query->sql, 'sqlite_master')
                || str_contains($query->sql, '`migrations`')
                || str_contains($query->sql, '"migrations"');
        });

        Nightwatch::rejectCacheKeys([
            '/^telescope:/',
            '/^pulse:/',
        ]);

        Nightwatch::redactOutgoingRequests(function (OutgoingRequest $request): void {
            $request->url = (string) preg_replace('/key=[^&]+/', 'key=***', $request->url);
        });
    }
}

