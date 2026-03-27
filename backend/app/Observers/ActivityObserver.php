<?php

namespace App\Observers;

use App\Events\ActivityCompleted;
use App\Models\Activity;

class ActivityObserver
{
    public function updated(Activity $activity): void
    {
        // Fire event when activity is marked complete
        if ($activity->wasChanged('completed_at') && $activity->completed_at !== null) {
            ActivityCompleted::dispatch($activity);
        }
    }
}
