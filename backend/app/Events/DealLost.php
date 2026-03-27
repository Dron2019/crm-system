<?php

namespace App\Events;

use App\Models\Deal;

class DealLost extends BaseModelEvent
{
    public function __construct(
        public readonly Deal $deal,
        public readonly ?string $lostReason = null,
    ) {
        parent::__construct($deal, $deal->team_id);
    }
}
