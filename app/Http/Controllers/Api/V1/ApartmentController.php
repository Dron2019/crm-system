<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\ApartmentResource;
use App\Models\Apartment;
use App\Models\Building;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ApartmentController extends Controller
{
    public function index(Request $request, Building $building): AnonymousResourceCollection
    {
        $this->authorize('view', $building);

        $query = $building->apartments();

        // Filters
        if ($request->has('floors') && is_array($request->input('floors'))) {
            $query->whereIn('floor', $request->input('floors'));
        }

        if ($request->has('rooms') && is_array($request->input('rooms'))) {
            $query->whereIn('rooms', $request->input('rooms'));
        }

        if ($request->has('status') && is_array($request->input('status'))) {
            $query->whereIn('status_id', $request->input('status'));
        }

        if ($request->has('price_min')) {
            $query->where('price', '>=', $request->input('price_min'));
        }

        if ($request->has('price_max')) {
            $query->where('price', '<=', $request->input('price_max'));
        }

        if ($request->has('area_min')) {
            $query->where('area', '>=', $request->input('area_min'));
        }

        if ($request->has('area_max')) {
            $query->where('area', '<=', $request->input('area_max'));
        }

        $apartments = $query
            ->with(['status', 'activeReservation.manager', 'media'])
            ->orderBy('floor', 'desc')
            ->orderBy('number', 'asc')
            ->paginate($request->input('per_page', 100));

        return ApartmentResource::collection($apartments);
    }

    public function show(Apartment $apartment): JsonResponse
    {
        $this->authorize('view', $apartment);

        return response()->json([
            'data' => new ApartmentResource(
                $apartment->load([
                    'status',
                    'project',
                    'building',
                    'section',
                    'activeReservation.manager',
                    'activeReservation.client',
                    'media',
                    'deals',
                ])
            ),
        ]);
    }

    public function update(Request $request, Apartment $apartment): JsonResponse
    {
        $this->authorize('update', $apartment);

        $validated = $request->validate([
            'number' => 'string|max:50',
            'floor' => 'integer|min:1',
            'rooms' => 'integer|min:1',
            'area' => 'numeric|min:1',
            'balcony_area' => 'nullable|numeric|min:0',
            'price' => 'numeric|min:0',
            'price_per_sqm' => 'nullable|numeric|min:0',
            'layout_type' => 'nullable|in:studio,1k,2k,3k,4k,5k,penthouse,other',
            'has_balcony' => 'boolean',
            'has_terrace' => 'boolean',
            'has_loggia' => 'boolean',
            'ceiling_height' => 'nullable|numeric|min:0',
            'custom_fields' => 'nullable|array',
        ]);

        $apartment->update($validated);

        return response()->json([
            'data' => new ApartmentResource($apartment),
        ]);
    }

    public function changeStatus(Request $request, Apartment $apartment): JsonResponse
    {
        $this->authorize('update', $apartment);

        $validated = $request->validate([
            'status_id' => 'required|exists:apartment_statuses,id',
            'notes' => 'nullable|string',
        ]);

        $oldStatus = $apartment->status;
        $apartment->update(['status_id' => $validated['status_id']]);

        return response()->json([
            'data' => new ApartmentResource($apartment->fresh('status')),
            'message' => 'Статус квартири змінено',
        ]);
    }
}
