<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Project\StoreProjectRequest;
use App\Http\Requests\Project\UpdateProjectRequest;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

class ProjectController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = $request->user()->currentTeam->projects();

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('city')) {
            $query->where('city', 'like', '%' . $request->input('city') . '%');
        }

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%$search%")
                    ->orWhere('brand', 'like', "%$search%")
                    ->orWhere('address', 'like', "%$search%");
            });
        }

        $projects = $query->orderByDesc('created_at')->paginate(
            $request->input('per_page', 15)
        );

        return ProjectResource::collection($projects);
    }

    public function store(StoreProjectRequest $request): JsonResponse
    {
        $project = new Project($request->validated());
        $project->team_id = $request->user()->current_team_id;
        $project->slug = Str::slug($request->input('name')) . '-' . Str::random(6);
        $project->save();

        return response()->json([
            'data' => new ProjectResource($project),
        ], 201);
    }

    public function show(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        return response()->json([
            'data' => new ProjectResource(
                $project->load([
                    'manager',
                    'buildings',
                    'documents',
                ])
            ),
        ]);
    }

    public function update(UpdateProjectRequest $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $project->update($request->validated());

        return response()->json([
            'data' => new ProjectResource($project),
        ]);
    }

    public function destroy(Project $project): JsonResponse
    {
        $this->authorize('delete', $project);

        $project->delete();

        return response()->json(null, 204);
    }

    public function stats(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $stats = [
            'total_buildings' => $project->buildings()->count(),
            'total_apartments' => $project->apartments()->count(),
            'available_apartments' => $project->apartments()
                ->whereHas('status', fn($q) => $q->where('name', 'Вільно'))
                ->count(),
            'sold_apartments' => $project->apartments()
                ->whereHas('status', fn($q) => $q->where('name', 'Продано'))
                ->count(),
            'reserved_apartments' => $project->apartments()
                ->whereHas('status', fn($q) => $q->where('name', 'Резерв'))
                ->count(),
        ];

        return response()->json(['data' => $stats]);
    }
}
