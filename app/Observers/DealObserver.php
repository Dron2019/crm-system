<?php

namespace App\Observers;

use App\Events\DealCreated;
use App\Events\DealDeleted;
use App\Events\DealLost;
use App\Events\DealStageChanged;
use App\Events\DealUpdated;
use App\Events\DealWon;
use App\Models\Deal;

class DealObserver
{
    public function created(Deal $deal): void
    {
        DealCreated::dispatch($deal);
    }

    public function updated(Deal $deal): void
    {
        $changed = $deal->getChanges();
        unset($changed['updated_at']);

        if (empty($changed)) {
            return;
        }

        // Detect stage change
        if ($deal->wasChanged('stage_id')) {
            DealStageChanged::dispatch(
                $deal,
                $deal->getOriginal('stage_id'),
                $deal->stage_id,
            );
        }

        // Detect won/lost status changes
        if ($deal->wasChanged('status')) {
            if ($deal->status === 'won') {
                DealWon::dispatch($deal);
            } elseif ($deal->status === 'lost') {
                DealLost::dispatch($deal, $deal->lost_reason);
            }
        }

        DealUpdated::dispatch($deal, $changed);
    }

    public function deleted(Deal $deal): void
    {
        DealDeleted::dispatch($deal);
    }
}
