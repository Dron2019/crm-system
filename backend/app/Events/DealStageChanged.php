<?php

namespace App\Events;

use App\Models\Deal;
use App\Models\Stage;

class DealStageChanged extends BaseModelEvent
{
    public function __construct(
        public readonly Deal $deal,
        public readonly string $previousStageId,
        public readonly string $newStageId,
    ) {
        parent::__construct($deal, $deal->team_id);
    }
}
