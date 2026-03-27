<?php

namespace App\Events;

use App\Models\Deal;

class DealUpdated extends BaseModelEvent
{
    public function __construct(
        public readonly Deal $deal,
        public readonly array $changedAttributes = [],
    ) {
        parent::__construct($deal, $deal->team_id);
    }
}
