<?php

namespace App\Services;

use App\Models\Workflow;
use App\Models\WorkflowLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

class WorkflowEngine
{
    public function trigger(string $eventType, Model $entity, array $context = []): void
    {
        $workflows = Workflow::where('team_id', $entity->team_id ?? null)
            ->where('is_active', true)
            ->where('trigger_type', $eventType)
            ->with('actions')
            ->get();

        foreach ($workflows as $workflow) {
            if (!$this->evaluateConditions($workflow, $entity, $context)) {
                continue;
            }

            $this->executeWorkflow($workflow, $entity, $context);
        }
    }

    protected function evaluateConditions(Workflow $workflow, Model $entity, array $context): bool
    {
        $conditions = $workflow->trigger_conditions;

        if (empty($conditions)) {
            return true;
        }

        foreach ($conditions as $condition) {
            $field = $condition['field'] ?? null;
            $operator = $condition['operator'] ?? 'equals';
            $value = $condition['value'] ?? null;

            if (!$field) continue;

            $entityValue = data_get($entity, $field) ?? data_get($context, $field);

            $match = match ($operator) {
                'equals' => $entityValue == $value,
                'not_equals' => $entityValue != $value,
                'contains' => is_string($entityValue) && str_contains($entityValue, $value),
                'greater_than' => $entityValue > $value,
                'less_than' => $entityValue < $value,
                'is_empty' => empty($entityValue),
                'is_not_empty' => !empty($entityValue),
                default => true,
            };

            if (!$match) return false;
        }

        return true;
    }

    protected function executeWorkflow(Workflow $workflow, Model $entity, array $context): void
    {
        $log = WorkflowLog::create([
            'workflow_id' => $workflow->id,
            'trigger_entity_id' => $entity->id,
            'trigger_entity_type' => get_class($entity),
            'status' => 'running',
        ]);

        $results = [];

        try {
            foreach ($workflow->actions as $action) {
                $result = $this->executeAction($action->type, $action->config, $entity, $context);
                $results[] = [
                    'action_id' => $action->id,
                    'type' => $action->type,
                    'status' => 'success',
                    'result' => $result,
                ];
            }

            $log->update([
                'status' => 'completed',
                'action_results' => $results,
            ]);

            $workflow->increment('execution_count');
            $workflow->update(['last_executed_at' => now()]);
        } catch (\Throwable $e) {
            $results[] = ['status' => 'failed', 'error' => $e->getMessage()];

            $log->update([
                'status' => 'failed',
                'action_results' => $results,
                'error_message' => $e->getMessage(),
            ]);

            Log::error('Workflow execution failed', [
                'workflow_id' => $workflow->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    protected function executeAction(string $type, array $config, Model $entity, array $context): mixed
    {
        return match ($type) {
            'update_field' => $this->actionUpdateField($config, $entity),
            'create_activity' => $this->actionCreateActivity($config, $entity),
            'send_notification' => $this->actionSendNotification($config, $entity),
            'send_email' => $this->actionSendEmail($config, $entity),
            'webhook' => $this->actionWebhook($config, $entity),
            default => null,
        };
    }

    protected function actionUpdateField(array $config, Model $entity): array
    {
        $field = $config['field'] ?? null;
        $value = $config['value'] ?? null;

        if ($field && $entity->isFillable($field)) {
            $entity->update([$field => $value]);
        }

        return ['field' => $field, 'value' => $value];
    }

    protected function actionCreateActivity(array $config, Model $entity): array
    {
        $activity = \App\Models\Activity::create([
            'team_id' => $entity->team_id,
            'type' => $config['type'] ?? 'task',
            'title' => $config['title'] ?? 'Auto-created activity',
            'description' => $config['description'] ?? null,
            'subject_type' => get_class($entity),
            'subject_id' => $entity->id,
        ]);

        return ['activity_id' => $activity->id];
    }

    protected function actionSendNotification(array $config, Model $entity): array
    {
        // Queue a notification to the assigned user or team
        $message = $config['message'] ?? 'Workflow triggered';
        Log::info('Workflow notification', ['message' => $message, 'entity' => $entity->id]);

        return ['message' => $message];
    }

    protected function actionSendEmail(array $config, Model $entity): array
    {
        // Would dispatch email via template or direct content
        Log::info('Workflow email action', ['to' => $config['to'] ?? 'N/A', 'entity' => $entity->id]);

        return ['to' => $config['to'] ?? null, 'template' => $config['template_id'] ?? null];
    }

    protected function actionWebhook(array $config, Model $entity): array
    {
        $url = $config['url'] ?? null;
        if (!$url) return ['error' => 'No URL configured'];

        // In production, dispatch as a job
        Log::info('Workflow webhook action', ['url' => $url, 'entity' => $entity->id]);

        return ['url' => $url, 'dispatched' => true];
    }
}
