<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditService
{
    public function log(
        string $action,
        Model $auditable,
        ?array $oldValues = null,
        ?array $newValues = null,
    ): AuditLog {
        $user = Auth::user();
        $teamId = $user?->current_team_id ?? $auditable->team_id ?? null;

        return AuditLog::create([
            'team_id' => $teamId,
            'user_id' => $user?->id,
            'action' => $action,
            'auditable_type' => $auditable->getMorphClass(),
            'auditable_id' => $auditable->getKey(),
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
        ]);
    }

    public function logCreated(Model $model): AuditLog
    {
        return $this->log('created', $model, null, $model->getAttributes());
    }

    public function logUpdated(Model $model): AuditLog
    {
        $dirty = $model->getChanges();
        $original = array_intersect_key($model->getOriginal(), $dirty);

        // Skip if only timestamps changed
        $meaningfulChanges = array_diff_key($dirty, array_flip(['updated_at', 'created_at']));
        if (empty($meaningfulChanges)) {
            return new AuditLog();
        }

        return $this->log('updated', $model, $original, $dirty);
    }

    public function logDeleted(Model $model): AuditLog
    {
        return $this->log('deleted', $model, $model->getAttributes(), null);
    }

    public function logRestored(Model $model): AuditLog
    {
        return $this->log('restored', $model);
    }

    public function logAction(string $action, Model $model, ?array $metadata = null): AuditLog
    {
        return $this->log($action, $model, null, $metadata);
    }
}
