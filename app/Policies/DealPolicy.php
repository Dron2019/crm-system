<?php

namespace App\Policies;

use App\Models\Deal;
use App\Models\User;

class DealPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('deals.view');
    }

    public function view(User $user, Deal $deal): bool
    {
        return $user->hasPermission('deals.view')
            && $deal->team_id === $user->current_team_id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('deals.create');
    }

    public function update(User $user, Deal $deal): bool
    {
        return $user->hasPermission('deals.update')
            && $deal->team_id === $user->current_team_id;
    }

    public function delete(User $user, Deal $deal): bool
    {
        return $user->hasPermission('deals.delete')
            && $deal->team_id === $user->current_team_id;
    }
}
