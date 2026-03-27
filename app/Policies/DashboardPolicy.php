<?php

namespace App\Policies;

use App\Models\Dashboard;
use App\Models\User;

class DashboardPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Dashboard $dashboard): bool
    {
        return $dashboard->team_id === $user->current_team_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Dashboard $dashboard): bool
    {
        return $dashboard->team_id === $user->current_team_id
            && $dashboard->created_by === $user->id;
    }

    public function delete(User $user, Dashboard $dashboard): bool
    {
        return $dashboard->team_id === $user->current_team_id
            && $dashboard->created_by === $user->id;
    }
}
