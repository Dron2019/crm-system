<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Workflow;
use App\Models\WorkflowAction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkflowController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $workflows = Workflow::where('team_id', $request->user()->current_team_id)
            ->with('actions')
            ->withCount('logs')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $workflows]);
    }

    public function show(Workflow $workflow): JsonResponse
    {
        $workflow->load(['actions', 'logs' => fn ($q) => $q->latest()->limit(20)]);

        return response()->json(['data' => $workflow]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'trigger_type' => ['required', 'string', 'max:100'],
            'trigger_conditions' => ['nullable', 'array'],
            'is_active' => ['boolean'],
            'actions' => ['required', 'array', 'min:1'],
            'actions.*.type' => ['required', 'string', 'in:send_email,update_field,create_activity,send_notification,webhook'],
            'actions.*.config' => ['required', 'array'],
        ]);

        $workflow = Workflow::create([
            'team_id' => $request->user()->current_team_id,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'trigger_type' => $validated['trigger_type'],
            'trigger_conditions' => $validated['trigger_conditions'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'created_by' => $request->user()->id,
        ]);

        foreach ($validated['actions'] as $index => $actionData) {
            WorkflowAction::create([
                'workflow_id' => $workflow->id,
                'type' => $actionData['type'],
                'config' => $actionData['config'],
                'order' => $index,
            ]);
        }

        $workflow->load('actions');

        return response()->json(['data' => $workflow], 201);
    }

    public function update(Request $request, Workflow $workflow): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'trigger_type' => ['sometimes', 'string', 'max:100'],
            'trigger_conditions' => ['nullable', 'array'],
            'is_active' => ['sometimes', 'boolean'],
            'actions' => ['sometimes', 'array', 'min:1'],
            'actions.*.type' => ['required_with:actions', 'string'],
            'actions.*.config' => ['required_with:actions', 'array'],
        ]);

        $workflow->update(collect($validated)->except('actions')->toArray());

        if (isset($validated['actions'])) {
            $workflow->actions()->delete();
            foreach ($validated['actions'] as $index => $actionData) {
                WorkflowAction::create([
                    'workflow_id' => $workflow->id,
                    'type' => $actionData['type'],
                    'config' => $actionData['config'],
                    'order' => $index,
                ]);
            }
        }

        $workflow->load('actions');

        return response()->json(['data' => $workflow]);
    }

    public function destroy(Workflow $workflow): JsonResponse
    {
        $workflow->delete();

        return response()->json(null, 204);
    }
}
