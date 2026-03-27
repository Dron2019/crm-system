<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\CustomField\StoreCustomFieldRequest;
use App\Http\Requests\CustomField\UpdateCustomFieldRequest;
use App\Http\Resources\CustomFieldResource;
use App\Models\CustomFieldDefinition;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomFieldController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $fields = CustomFieldDefinition::query()
            ->where('team_id', $request->user()->current_team_id)
            ->when($request->input('entity_type'), fn ($q, $type) => $q->where('entity_type', $type))
            ->orderBy('display_order')
            ->get();

        return response()->json(['data' => CustomFieldResource::collection($fields)->resolve()]);
    }

    public function store(StoreCustomFieldRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $teamId = $request->user()->current_team_id;

        $maxOrder = CustomFieldDefinition::where('team_id', $teamId)
            ->where('entity_type', $validated['entity_type'])
            ->max('display_order') ?? -1;

        $field = CustomFieldDefinition::create([
            ...$validated,
            'team_id' => $teamId,
            'display_order' => $maxOrder + 1,
        ]);

        return response()->json(['data' => (new CustomFieldResource($field))->resolve()], 201);
    }

    public function update(UpdateCustomFieldRequest $request, CustomFieldDefinition $customField): JsonResponse
    {
        $customField->update($request->validated());

        return response()->json(['data' => (new CustomFieldResource($customField))->resolve()]);
    }

    public function destroy(CustomFieldDefinition $customField): JsonResponse
    {
        $customField->delete();

        return response()->json(null, 204);
    }
}
