<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Deal\StoreDealRequest;
use App\Http\Requests\Deal\UpdateDealRequest;
use App\Http\Resources\DealResource;
use App\Models\Deal;
use App\Services\DealService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DealController extends Controller
{
    public function __construct(
        private readonly DealService $dealService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $deals = $this->dealService->list($request);

        return DealResource::collection($deals);
    }

    public function store(StoreDealRequest $request): JsonResponse
    {
        $deal = $this->dealService->create(
            $request->validated(),
            $request->input('tag_ids'),
        );

        return response()->json([
            'data' => new DealResource($deal),
        ], 201);
    }

    public function show(Deal $deal): JsonResponse
    {
        return response()->json([
            'data' => new DealResource(
                $deal->load(['pipeline', 'stage', 'contact', 'company', 'assignedTo', 'tags', 'activities', 'notes'])
            ),
        ]);
    }

    public function update(UpdateDealRequest $request, Deal $deal): JsonResponse
    {
        $deal = $this->dealService->update(
            $deal,
            $request->validated(),
            $request->input('tag_ids'),
        );

        return response()->json([
            'data' => new DealResource($deal),
        ]);
    }

    public function destroy(Deal $deal): JsonResponse
    {
        $this->dealService->delete($deal);

        return response()->json(null, 204);
    }
}
