<?php

namespace App\Listeners;

use App\Events\ActivityCompleted;
use App\Events\BaseModelEvent;
use App\Events\CompanyCreated;
use App\Events\CompanyDeleted;
use App\Events\CompanyUpdated;
use App\Events\ContactCreated;
use App\Events\ContactDeleted;
use App\Events\ContactUpdated;
use App\Events\DealCreated;
use App\Events\DealDeleted;
use App\Events\DealLost;
use App\Events\DealStageChanged;
use App\Events\DealUpdated;
use App\Events\DealWon;
use App\Events\NoteCreated;
use App\Services\WorkflowEngine;

class RunWorkflowAutomation
{
    public function __construct(private readonly WorkflowEngine $workflowEngine)
    {
    }

    public function handle(BaseModelEvent $event): void
    {
        $eventType = $this->mapEventType($event);

        if ($eventType === null) {
            return;
        }

        $context = [];

        $entityName = class_basename($event->model);
        $context[strtolower($entityName)] = $event->model->toArray();
        $context['entity'] = $event->model->toArray();

        if (property_exists($event, 'changedAttributes')) {
            $context['changedAttributes'] = $event->changedAttributes;
        }

        if ($event instanceof DealStageChanged) {
            $context['old_stage_id'] = $event->oldStageId;
            $context['new_stage_id'] = $event->newStageId;
        }

        if ($event instanceof DealLost) {
            $context['lost_reason'] = $event->lostReason;
        }

        $this->workflowEngine->trigger($eventType, $event->model, $context);
    }

    private function mapEventType(BaseModelEvent $event): ?string
    {
        return match (true) {
            $event instanceof ContactCreated => 'contact.created',
            $event instanceof ContactUpdated => 'contact.updated',
            $event instanceof ContactDeleted => 'contact.deleted',
            $event instanceof CompanyCreated => 'company.created',
            $event instanceof CompanyUpdated => 'company.updated',
            $event instanceof CompanyDeleted => 'company.deleted',
            $event instanceof DealCreated => 'deal.created',
            $event instanceof DealUpdated => 'deal.updated',
            $event instanceof DealDeleted => 'deal.deleted',
            $event instanceof DealWon => 'deal.won',
            $event instanceof DealLost => 'deal.lost',
            $event instanceof DealStageChanged => 'deal.stage_changed',
            $event instanceof ActivityCompleted => 'activity.completed',
            $event instanceof NoteCreated => 'note.created',
            default => null,
        };
    }
}
