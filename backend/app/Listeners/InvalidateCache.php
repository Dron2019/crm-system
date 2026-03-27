<?php

namespace App\Listeners;

use App\Events\BaseModelEvent;
use Illuminate\Support\Facades\Cache;

class InvalidateCache
{
    public function handle(BaseModelEvent $event): void
    {
        $teamId = $event->teamId;
        if (!$teamId) {
            return;
        }

        $entity = strtolower(class_basename($event->model));

        // Flush entity-specific caches using tags
        Cache::tags(["team:{$teamId}", "{$entity}s"])->flush();

        // Also flush dashboard/stats caches
        Cache::tags(["team:{$teamId}", 'dashboard'])->flush();
    }
}
