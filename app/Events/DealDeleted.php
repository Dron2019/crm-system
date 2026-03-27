<?php

namespace App\Events;

use App\Models\Deal;

class DealDeleted extends BaseModelEvent
{
    public function __construct(public readonly Deal $deal)
    {
        parent::__construct($deal, $deal->team_id);
    }
}
