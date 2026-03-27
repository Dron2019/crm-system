<?php

namespace App\Policies;

use App\Models\Pipeline;
use App\Models\User;

class PipelinePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('pipelines.view');
    }

    public function view(User $user, Pipeline $pipeline): bool
    {
        return $user->hasPermission('pipelines.view')
            && $pipeline->team_id === $user->current_team_id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('pipelines.create');
    }

    public function update(User $user, Pipeline $pipeline): bool
    {
        return $user->hasPermission('pipelines.update')
            && $pipeline->team_id === $user->current_team_id;
    }

    public function delete(User $user, Pipeline $pipeline): bool
    {
        return $user->hasPermission('pipelines.delete')
            && $pipeline->team_id === $user->current_team_id;
    }
}
