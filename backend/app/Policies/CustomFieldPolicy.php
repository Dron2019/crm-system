<?php

namespace App\Policies;

use App\Models\CustomFieldDefinition;
use App\Models\User;

class CustomFieldPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('custom_fields.view');
    }

    public function view(User $user, CustomFieldDefinition $customField): bool
    {
        return $user->hasPermission('custom_fields.view')
            && $customField->team_id === $user->current_team_id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('custom_fields.create');
    }

    public function update(User $user, CustomFieldDefinition $customField): bool
    {
        return $user->hasPermission('custom_fields.update')
            && $customField->team_id === $user->current_team_id;
    }

    public function delete(User $user, CustomFieldDefinition $customField): bool
    {
        return $user->hasPermission('custom_fields.delete')
            && $customField->team_id === $user->current_team_id;
    }
}
