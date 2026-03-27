<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\DashboardResource;
use App\Models\Dashboard;
use App\Models\DashboardWidget;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DashboardController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $dashboards = Dashboard::query()
            ->where('team_id', $request->user()->current_team_id)
            ->with('widgets', 'creator')
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get();

        return DashboardResource::collection($dashboards);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_default' => 'boolean',
            'layout' => 'nullable|array',
        ]);

        $teamId = $request->user()->current_team_id;

        // If setting as default, unset other defaults
        if (!empty($validated['is_default'])) {
            Dashboard::where('team_id', $teamId)
                ->where('is_default', true)
                ->update(['is_default' => false]);
        }

        $dashboard = Dashboard::create([
            ...$validated,
            'team_id' => $teamId,
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'data' => new DashboardResource($dashboard->load('widgets', 'creator')),
        ], 201);
    }

    public function show(Dashboard $dashboard): JsonResponse
    {
        return response()->json([
            'data' => new DashboardResource($dashboard->load('widgets', 'creator')),
        ]);
    }

    public function update(Request $request, Dashboard $dashboard): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'is_default' => 'boolean',
            'layout' => 'nullable|array',
        ]);

        if (!empty($validated['is_default'])) {
            Dashboard::where('team_id', $dashboard->team_id)
                ->where('id', '!=', $dashboard->id)
                ->where('is_default', true)
                ->update(['is_default' => false]);
        }

        $dashboard->update($validated);

        return response()->json([
            'data' => new DashboardResource($dashboard->load('widgets', 'creator')),
        ]);
    }

    public function destroy(Dashboard $dashboard): JsonResponse
    {
        $dashboard->widgets()->delete();
        $dashboard->delete();

        return response()->json(null, 204);
    }

    public function addWidget(Request $request, Dashboard $dashboard): JsonResponse
    {
        $validated = $request->validate([
            'widget_type' => 'required|string|max:100',
            'config' => 'nullable|array',
            'position' => 'nullable|integer|min:0',
            'size_x' => 'nullable|integer|min:1|max:12',
            'size_y' => 'nullable|integer|min:1|max:12',
            'refresh_interval' => 'nullable|integer|min:0',
        ]);

        $maxPosition = $dashboard->widgets()->max('position') ?? -1;

        $widget = $dashboard->widgets()->create([
            ...$validated,
            'position' => $validated['position'] ?? $maxPosition + 1,
        ]);

        return response()->json(['data' => $widget], 201);
    }

    public function updateWidget(Request $request, Dashboard $dashboard, DashboardWidget $widget): JsonResponse
    {
        $validated = $request->validate([
            'config' => 'nullable|array',
            'position' => 'nullable|integer|min:0',
            'size_x' => 'nullable|integer|min:1|max:12',
            'size_y' => 'nullable|integer|min:1|max:12',
            'refresh_interval' => 'nullable|integer|min:0',
        ]);

        $widget->update($validated);

        return response()->json(['data' => $widget]);
    }

    public function removeWidget(Dashboard $dashboard, DashboardWidget $widget): JsonResponse
    {
        $widget->delete();

        return response()->json(null, 204);
    }
}
