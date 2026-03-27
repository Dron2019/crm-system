<?php

namespace App\Providers;

use App\Events\ActivityCompleted;
use App\Events\CompanyCreated;
use App\Events\CompanyDeleted;
use App\Events\CompanyUpdated;
use App\Events\ContactCreated;
use App\Events\ContactDeleted;
use App\Events\ContactUpdated;
use App\Events\DealCreated;
use App\Events\DealDeleted;
use App\Events\DealLost;
use App\Events\DealStageChanged;
use App\Events\DealUpdated;
use App\Events\DealWon;
use App\Events\NoteCreated;
use App\Listeners\InvalidateCache;
use App\Listeners\LogDealStageChange;
use App\Listeners\WriteAuditLog;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    protected $listen = [
        // Contact events
        ContactCreated::class => [
            WriteAuditLog::class,
            InvalidateCache::class,
        ],
        ContactUpdated::class => [
            WriteAuditLog::class,
            InvalidateCache::class,
        ],
        ContactDeleted::class => [
            WriteAuditLog::class,
            InvalidateCache::class,
        ],

        // Company events
        CompanyCreated::class => [
            WriteAuditLog::class,
            InvalidateCache::class,
        ],
        CompanyUpdated::class => [
            WriteAuditLog::class,
            InvalidateCache::class,
        ],
        CompanyDeleted::class => [
            WriteAuditLog::class,
            InvalidateCache::class,
        ],

        // Deal events
        DealCreated::class => [
            WriteAuditLog::class,
            InvalidateCache::class,
        ],
        DealUpdated::class => [
            WriteAuditLog::class,
            InvalidateCache::class,
        ],
        DealDeleted::class => [
            WriteAuditLog::class,
            InvalidateCache::class,
        ],
        DealStageChanged::class => [
            WriteAuditLog::class,
            LogDealStageChange::class,
        ],
        DealWon::class => [
            WriteAuditLog::class,
        ],
        DealLost::class => [
            WriteAuditLog::class,
        ],

        // Activity events
        ActivityCompleted::class => [
            WriteAuditLog::class,
        ],

        // Note events
        NoteCreated::class => [
            WriteAuditLog::class,
        ],
    ];
}
