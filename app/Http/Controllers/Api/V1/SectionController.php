<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\SectionResource;
use App\Models\Building;
use App\Models\Section;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SectionController extends Controller
{
    public function store(Request $request, Building $building): JsonResponse
    {
        $this->authorize('update', $building);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'number' => 'nullable|string|max:50',
            'description' => 'nullable|string',
        ]);

        $section = new Section($validated);
        $section->team_id = $request->user()->current_team_id;
        $section->building_id = $building->id;
        $section->save();

        return response()->json([
            'data' => new SectionResource($section),
        ], 201);
    }

    public function update(Request $request, Section $section): JsonResponse
    {
        $this->authorize('update', $section);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'number' => 'nullable|string|max:50',
            'description' => 'nullable|string',
        ]);

        $section->update($validated);

        return response()->json([
            'data' => new SectionResource($section),
        ]);
    }

    public function destroy(Section $section): JsonResponse
    {
        $this->authorize('delete', $section);

        $section->delete();

        return response()->json(null, 204);
    }
}