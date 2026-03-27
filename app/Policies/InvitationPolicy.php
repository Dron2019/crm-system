<?php

namespace App\Policies;

use App\Models\Invitation;
use App\Models\User;

class InvitationPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('team.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('team.members.invite');
    }

    public function delete(User $user, Invitation $invitation): bool
    {
        return $user->hasPermission('team.members.invite')
            && $invitation->team_id === $user->current_team_id;
    }
}
