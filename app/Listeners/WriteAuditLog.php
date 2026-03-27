<?php

namespace App\Listeners;

use App\Events\BaseModelEvent;
use App\Services\AuditService;

class WriteAuditLog
{
    public function __construct(
        private readonly AuditService $auditService,
    ) {}

    public function handle(BaseModelEvent $event): void
    {
        $model = $event->model;
        $eventClass = class_basename($event);

        // Determine action from event class name
        $action = match (true) {
            str_contains($eventClass, 'Created') => 'created',
            str_contains($eventClass, 'Updated') => 'updated',
            str_contains($eventClass, 'Deleted') => 'deleted',
            str_contains($eventClass, 'StageChanged') => 'stage_changed',
            str_contains($eventClass, 'Won') => 'won',
            str_contains($eventClass, 'Lost') => 'lost',
            str_contains($eventClass, 'Completed') => 'completed',
            default => strtolower($eventClass),
        };

        $oldValues = null;
        $newValues = null;

        if (property_exists($event, 'changedAttributes') && !empty($event->changedAttributes)) {
            $newValues = $event->changedAttributes;
            $oldValues = array_intersect_key($model->getOriginal(), $event->changedAttributes);
        } elseif ($action === 'created') {
            $newValues = $model->getAttributes();
        } elseif ($action === 'deleted') {
            $oldValues = $model->getAttributes();
        }

        $this->auditService->log($action, $model, $oldValues, $newValues);
    }
}
