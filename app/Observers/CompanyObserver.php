<?php

namespace App\Observers;

use App\Events\CompanyCreated;
use App\Events\CompanyDeleted;
use App\Events\CompanyUpdated;
use App\Models\Company;

class CompanyObserver
{
    public function created(Company $company): void
    {
        CompanyCreated::dispatch($company);
    }

    public function updated(Company $company): void
    {
        $changed = $company->getChanges();
        unset($changed['updated_at']);

        if (!empty($changed)) {
            CompanyUpdated::dispatch($company, $changed);
        }
    }

    public function deleted(Company $company): void
    {
        CompanyDeleted::dispatch($company);
    }
}
