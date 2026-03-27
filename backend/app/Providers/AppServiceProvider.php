<?php

namespace App\Providers;

use App\Models\Activity;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Note;
use App\Observers\ActivityObserver;
use App\Observers\CompanyObserver;
use App\Observers\ContactObserver;
use App\Observers\DealObserver;
use App\Observers\NoteObserver;
use Illuminate\Support\ServiceProvider;

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
        Contact::observe(ContactObserver::class);
        Company::observe(CompanyObserver::class);
        Deal::observe(DealObserver::class);
        Activity::observe(ActivityObserver::class);
        Note::observe(NoteObserver::class);
    }
}
