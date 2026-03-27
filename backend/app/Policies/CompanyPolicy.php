<?php

namespace App\Policies;

use App\Models\Company;
use App\Models\User;

class CompanyPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('companies.view');
    }

    public function view(User $user, Company $company): bool
    {
        return $user->hasPermission('companies.view')
            && $company->team_id === $user->current_team_id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('companies.create');
    }

    public function update(User $user, Company $company): bool
    {
        return $user->hasPermission('companies.update')
            && $company->team_id === $user->current_team_id;
    }

    public function delete(User $user, Company $company): bool
    {
        return $user->hasPermission('companies.delete')
            && $company->team_id === $user->current_team_id;
    }
}
