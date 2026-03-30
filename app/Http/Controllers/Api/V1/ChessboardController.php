<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Building;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChessboardController extends Controller
{
    public function show(Request $request, Building $building): JsonResponse
    {
        $this->authorize('view', $building);

        // Build filters query
        $query = DB::table('v_chessgrid')
            ->where('building_id', $building->id)
            ->where('team_id', $request->user()->current_team_id);

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

        $apartments = $query->orderBy('floor', 'desc')->orderBy('number', 'asc')->get();

        // Get unique sections
        $sections = $building->sections()->get();

        // Get max floor for UI rendering
        $maxFloor = $apartments->max('floor') ?? 1;

        // Get all statuses for legend
        $statuses = DB::table('apartment_statuses')
            ->where('team_id', $request->user()->current_team_id)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get()
            ->toArray();

        return response()->json([
            'data' => [
                'building' => $building->load('project')->toArray(),
                'sections' => $sections->toArray(),
                'apartments' => $apartments->toArray(),
                'statuses' => $statuses,
                'structure' => [
                    'max_floor' => $maxFloor,
                    'total_apartments' => count($apartments),
                    'sections_count' => $sections->count(),
                ],
            ],
        ]);
    }

    public function filters(Request $request, Building $building): JsonResponse
    {
        $this->authorize('view', $building);

        $apartments = $building->apartments()
            ->with('status')
            ->get();

        return response()->json([
            'data' => [
                'floors' => [
                    'min' => $apartments->min('floor') ?? 1,
                    'max' => $apartments->max('floor') ?? 1,
                    'values' => $apartments->pluck('floor')->unique()->sort()->values(),
                ],
                'rooms' => $apartments->pluck('rooms')->unique()->sort()->values(),
                'area' => [
                    'min' => $apartments->min('area') ?? 0,
                    'max' => $apartments->max('area') ?? 0,
                ],
                'price' => [
                    'min' => $apartments->min('price') ?? 0,
                    'max' => $apartments->max('price') ?? 0,
                ],
                'statuses' => $apartments
                    ->load('status')
                    ->groupBy('status_id')
                    ->map(fn($group) => [
                        'id' => $group->first()->status_id,
                        'name' => $group->first()->status->name,
                        'color' => $group->first()->status->color,
                        'count' => $group->count(),
                    ])
                    ->values(),
            ],
        ]);
    }
}
