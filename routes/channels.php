<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('team.{teamId}', function ($user, $teamId) {
    return $user->current_team_id === $teamId;
});

Broadcast::channel('user.{userId}', function ($user, $userId) {
    return $user->id === $userId;
});
