<?php

namespace App\Policies;

use App\Models\Note;
use App\Models\User;

class NotePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('notes.view');
    }

    public function view(User $user, Note $note): bool
    {
        return $user->hasPermission('notes.view')
            && $note->team_id === $user->current_team_id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('notes.create');
    }

    public function update(User $user, Note $note): bool
    {
        return $user->hasPermission('notes.update')
            && $note->team_id === $user->current_team_id;
    }

    public function delete(User $user, Note $note): bool
    {
        return $user->hasPermission('notes.delete')
            && $note->team_id === $user->current_team_id;
    }
}
