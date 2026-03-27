<?php

namespace App\Policies;

use App\Models\Contact;
use App\Models\User;

class ContactPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('contacts.view');
    }

    public function view(User $user, Contact $contact): bool
    {
        return $user->hasPermission('contacts.view')
            && $contact->team_id === $user->current_team_id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('contacts.create');
    }

    public function update(User $user, Contact $contact): bool
    {
        return $user->hasPermission('contacts.update')
            && $contact->team_id === $user->current_team_id;
    }

    public function delete(User $user, Contact $contact): bool
    {
        return $user->hasPermission('contacts.delete')
            && $contact->team_id === $user->current_team_id;
    }
}
