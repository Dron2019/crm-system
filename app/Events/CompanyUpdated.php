<?php

namespace App\Events;

use App\Models\Company;

class CompanyUpdated extends BaseModelEvent
{
    public function __construct(
        public readonly Company $company,
        public readonly array $changedAttributes = [],
    ) {
        parent::__construct($company, $company->team_id);
    }
}
