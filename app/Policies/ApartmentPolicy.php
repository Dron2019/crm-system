<?php

namespace App\Policies;

use App\Models\Apartment;
use App\Models\User;

class ApartmentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('apartments.view');
    }

    public function view(User $user, Apartment $apartment): bool
    {
        return $user->hasPermission('apartments.view')
            && $apartment->team_id === $user->current_team_id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('apartments.create');
    }

    public function update(User $user, Apartment $apartment): bool
    {
        return $user->hasPermission('apartments.update')
            && $apartment->team_id === $user->current_team_id;
    }

    public function delete(User $user, Apartment $apartment): bool
    {
        return $user->hasPermission('apartments.delete')
            && $apartment->team_id === $user->current_team_id;
    }
}
