<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Deal\StoreDealRequest;
use App\Http\Requests\Deal\UpdateDealRequest;
use App\Http\Resources\DealResource;
use App\Models\Apartment;
use App\Models\Deal;
use App\Services\AuditService;
use App\Services\DealService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DealController extends Controller
{
    public function __construct(
        private readonly DealService $dealService,
        private readonly AuditService $auditService,
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
                $deal->load(['pipeline', 'stage', 'contact', 'company', 'assignedTo', 'apartment', 'attachedBy', 'tags', 'activities', 'notes'])
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

    public function attachApartment(Request $request, Deal $deal): JsonResponse
    {
        $request->validate([
            'apartment_id' => 'required|uuid|exists:apartments,id',
        ]);

        $apartmentId = $request->input('apartment_id');

        // Verify apartment belongs to same team
        $apartment = Apartment::where('id', $apartmentId)
            ->where('team_id', $deal->team_id)
            ->firstOrFail();

        $deal->update([
            'apartment_id' => $apartmentId,
            'attached_by' => auth()->id(),
            'attached_at' => now(),
        ]);

        $this->auditService->logAction('apartment_attached', $deal, [
            'apartment_id' => $apartment->id,
            'apartment_number' => $apartment->number,
            'building_id' => $apartment->building_id,
            'building_name' => $apartment->building?->name,
            'attached_by' => auth()->id(),
        ]);

        return response()->json([
            'data' => new DealResource($deal->load(['apartment', 'attachedBy'])),
        ]);
    }

    public function detachApartment(Deal $deal): JsonResponse
    {
        $apartment = $deal->apartment;

        $deal->update([
            'apartment_id' => null,
            'attached_by' => null,
            'attached_at' => null,
        ]);

        $this->auditService->logAction('apartment_detached', $deal, [
            'apartment_id' => $apartment?->id,
            'apartment_number' => $apartment?->number,
            'building_id' => $apartment?->building_id,
            'building_name' => $apartment?->building?->name,
            'detached_by' => auth()->id(),
        ]);

        return response()->json([
            'data' => new DealResource($deal->load(['apartment', 'attachedBy'])),
        ]);
    }
}
