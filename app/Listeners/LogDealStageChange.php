<?php

namespace App\Listeners;

use App\Events\DealStageChanged;
use App\Models\Activity;

class LogDealStageChange
{
    public function handle(DealStageChanged $event): void
    {
        $deal = $event->deal;

        Activity::create([
            'team_id' => $deal->team_id,
            'user_id' => auth()->id(),
            'subject_type' => $deal->getMorphClass(),
            'subject_id' => $deal->id,
            'type' => 'note',
            'title' => "Deal moved to stage: {$deal->stage->name}",
            'description' => "Deal '{$deal->title}' was moved from a previous stage.",
            'completed_at' => now(),
        ]);
    }
}
