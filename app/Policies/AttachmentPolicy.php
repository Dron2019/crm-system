<?php

namespace App\Policies;

use App\Models\Attachment;
use App\Models\User;

class AttachmentPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Attachment $attachment): bool
    {
        return $attachment->team_id === $user->current_team_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function delete(User $user, Attachment $attachment): bool
    {
        return $attachment->team_id === $user->current_team_id
            && ($attachment->user_id === $user->id || $user->hasPermission('attachments.delete'));
    }
}
