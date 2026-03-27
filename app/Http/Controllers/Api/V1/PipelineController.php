<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Pipeline\StorePipelineRequest;
use App\Http\Requests\Pipeline\UpdatePipelineRequest;
use App\Http\Resources\PipelineResource;
use App\Models\Pipeline;
use App\Services\PipelineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PipelineController extends Controller
{
    public function __construct(
        private readonly PipelineService $pipelineService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $pipelines = $this->pipelineService->list();

        return PipelineResource::collection($pipelines);
    }

    public function store(StorePipelineRequest $request): JsonResponse
    {
        $pipeline = $this->pipelineService->create(
            $request->validated(),
            $request->input('stages'),
        );

        return response()->json([
            'data' => new PipelineResource($pipeline),
        ], 201);
    }

    public function show(Pipeline $pipeline): JsonResponse
    {
        return response()->json([
            'data' => new PipelineResource($pipeline->load('stages')),
        ]);
    }

    public function update(UpdatePipelineRequest $request, Pipeline $pipeline): JsonResponse
    {
        $pipeline = $this->pipelineService->update(
            $pipeline,
            $request->safe()->except(['stages']),
            $request->input('stages'),
        );

        return response()->json([
            'data' => new PipelineResource($pipeline),
        ]);
    }

    public function destroy(Pipeline $pipeline): JsonResponse
    {
        $this->pipelineService->delete($pipeline);

        return response()->json(null, 204);
    }
}
