<?php

namespace App\Policies;

use App\Models\Report;
use App\Models\User;

class ReportPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('reports.view');
    }

    public function view(User $user, Report $report): bool
    {
        return $user->hasPermission('reports.view')
            && $report->team_id === $user->current_team_id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('reports.view');
    }

    public function update(User $user, Report $report): bool
    {
        return $user->hasPermission('reports.view')
            && $report->team_id === $user->current_team_id
            && $report->created_by === $user->id;
    }

    public function delete(User $user, Report $report): bool
    {
        return $user->hasPermission('reports.view')
            && $report->team_id === $user->current_team_id
            && $report->created_by === $user->id;
    }
}
