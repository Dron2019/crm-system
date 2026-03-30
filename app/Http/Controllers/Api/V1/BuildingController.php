<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\BuildingResource;
use App\Models\Building;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BuildingController extends Controller
{
    public function index(Request $request, Project $project): AnonymousResourceCollection
    {
        $this->authorize('view', $project);

        $buildings = $project->buildings()
            ->withCount('apartments')
            ->paginate($request->input('per_page', 15));

        return BuildingResource::collection($buildings);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'number' => 'nullable|string|max:50',
            'city' => 'nullable|string|max:100',
            'address' => 'nullable|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'total_floors' => 'nullable|integer|min:1',
            'total_apartments' => 'nullable|integer|min:0',
            'status' => 'nullable|in:planning,construction,ready,populated,archived',
            'construction_start' => 'nullable|date',
            'completion_date' => 'nullable|date',
            'description' => 'nullable|string',
        ]);

        $building = new Building($validated);
        $building->team_id = $request->user()->current_team_id;
        $building->project_id = $project->id;
        $building->save();

        return response()->json([
            'data' => new BuildingResource($building),
        ], 201);
    }

    public function show(Building $building): JsonResponse
    {
        $this->authorize('view', $building);

        return response()->json([
            'data' => new BuildingResource(
                $building->load(['project', 'sections'])
            ),
        ]);
    }

    public function update(Request $request, Building $building): JsonResponse
    {
        $this->authorize('update', $building);

        $validated = $request->validate([
            'name' => 'string|max:255',
            'number' => 'nullable|string|max:50',
            'city' => 'nullable|string|max:100',
            'address' => 'nullable|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'total_floors' => 'nullable|integer|min:1',
            'total_apartments' => 'nullable|integer|min:0',
            'status' => 'nullable|in:planning,construction,ready,populated,archived',
            'construction_start' => 'nullable|date',
            'completion_date' => 'nullable|date',
            'description' => 'nullable|string',
        ]);

        $building->update($validated);

        return response()->json([
            'data' => new BuildingResource($building),
        ]);
    }

    public function destroy(Building $building): JsonResponse
    {
        $this->authorize('delete', $building);

        $building->delete();

        return response()->json(null, 204);
    }
}
