<?php

namespace App\Events;

use App\Models\Company;

class CompanyDeleted extends BaseModelEvent
{
    public function __construct(public readonly Company $company)
    {
        parent::__construct($company, $company->team_id);
    }
}
