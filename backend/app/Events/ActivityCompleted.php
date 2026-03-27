<?php

namespace App\Events;

use App\Models\Activity;

class ActivityCompleted extends BaseModelEvent
{
    public function __construct(public readonly Activity $activity)
    {
        parent::__construct($activity, $activity->team_id);
    }
}
