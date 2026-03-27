<?php

namespace App\Policies;

use App\Models\Tag;
use App\Models\User;

class TagPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('tags.view');
    }

    public function view(User $user, Tag $tag): bool
    {
        return $user->hasPermission('tags.view')
            && $tag->team_id === $user->current_team_id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('tags.create');
    }

    public function update(User $user, Tag $tag): bool
    {
        return $user->hasPermission('tags.update')
            && $tag->team_id === $user->current_team_id;
    }

    public function delete(User $user, Tag $tag): bool
    {
        return $user->hasPermission('tags.delete')
            && $tag->team_id === $user->current_team_id;
    }
}
