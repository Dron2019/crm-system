<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Activity\StoreActivityRequest;
use App\Http\Requests\Activity\UpdateActivityRequest;
use App\Http\Resources\ActivityResource;
use App\Models\Activity;
use App\Services\ActivityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ActivityController extends Controller
{
    public function __construct(
        private readonly ActivityService $activityService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $activities = $this->activityService->list($request);

        return ActivityResource::collection($activities);
    }

    public function store(StoreActivityRequest $request): JsonResponse
    {
        $activity = $this->activityService->create($request->validated(), $request->user());

        return response()->json([
            'data' => new ActivityResource($activity),
        ], 201);
    }

    public function show(Activity $activity): JsonResponse
    {
        return response()->json([
            'data' => new ActivityResource($activity->load(['user', 'subject'])),
        ]);
    }

    public function update(UpdateActivityRequest $request, Activity $activity): JsonResponse
    {
        $activity = $this->activityService->update($activity, $request->validated());

        return response()->json([
            'data' => new ActivityResource($activity),
        ]);
    }

    public function destroy(Activity $activity): JsonResponse
    {
        $this->activityService->delete($activity);

        return response()->json(null, 204);
    }

    public function complete(Activity $activity): JsonResponse
    {
        $activity->update(['completed_at' => now()]);

        return response()->json([
            'data' => new ActivityResource($activity->load(['user', 'subject'])),
        ]);
    }
}
