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
    public function store(Request $request, Building $building): JsonResponse
    {
        $this->authorize('update', $building);

        $validated = $request->validate([
            'section_id' => 'nullable|uuid|exists:sections,id',
            'number' => 'required|string|max:50',
            'floor' => 'required|integer|min:0|max:200',
            'rooms' => 'required|integer|min:1|max:20',
            'area' => 'required|numeric|min:1',
            'balcony_area' => 'nullable|numeric|min:0',
            'price' => 'required|numeric|min:0',
            'status_id' => 'nullable|uuid|exists:apartment_statuses,id',
            'layout_type' => 'nullable|in:studio,1k,2k,3k,4k,5k,penthouse,other',
            'has_balcony' => 'nullable|boolean',
            'has_terrace' => 'nullable|boolean',
            'has_loggia' => 'nullable|boolean',
            'ceiling_height' => 'nullable|numeric|min:0',
            'custom_fields' => 'nullable|array',
        ]);

        $apartment = new Apartment($validated);
        $apartment->team_id = $request->user()->current_team_id;
        $apartment->project_id = $building->project_id;
        $apartment->building_id = $building->id;

        if (!isset($validated['has_balcony'])) {
            $apartment->has_balcony = false;
        }
        if (!isset($validated['has_terrace'])) {
            $apartment->has_terrace = false;
        }
        if (!isset($validated['has_loggia'])) {
            $apartment->has_loggia = false;
        }

        if ($apartment->area > 0 && $apartment->price > 0) {
            $apartment->price_per_sqm = round($apartment->price / $apartment->area, 2);
        }

        $apartment->save();

        return response()->json([
            'data' => new ApartmentResource($apartment->load(['status', 'section'])),
        ], 201);
    }

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
