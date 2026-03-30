<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\ReservationResource;
use App\Models\Apartment;
use App\Models\Reservation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReservationController extends Controller
{
    public function store(Request $request, Apartment $apartment): JsonResponse
    {
        $this->authorize('update', $apartment);

        $validated = $request->validate([
            'client_id' => 'nullable|exists:contacts,id',
            'manager_id' => 'required|exists:users,id',
            'expires_at' => 'nullable|date|after:today',
            'notes' => 'nullable|string',
        ]);

        // Check if apartment is available for reservation
        if (!$apartment->status?->can_reserve) {
            return response()->json([
                'error' => 'Квартира не доступна для бронювання',
            ], 422);
        }

        // Cancel any existing active reservation
        $apartment->reservations()->where('status', 'active')->update(['status' => 'cancelled']);

        $reservation = new Reservation($validated);
        $reservation->team_id = $request->user()->current_team_id;
        $reservation->apartment_id = $apartment->id;
        $reservation->status = 'active';
        $reservation->save();

        return response()->json([
            'data' => new ReservationResource($reservation),
        ], 201);
    }

    public function destroy(Reservation $reservation): JsonResponse
    {
        $this->authorize('delete', $reservation);

        $reservation->update(['status' => 'cancelled']);

        return response()->json(null, 204);
    }

    public function convert(Request $request, Reservation $reservation): JsonResponse
    {
        $this->authorize('update', $reservation);

        $validated = $request->validate([
            'deal_id' => 'required|exists:deals,id',
        ]);

        $reservation->update([
            'status' => 'converted',
            'deal_id' => $validated['deal_id'],
        ]);

        // Update apartment status to sold
        $soldStatus = $reservation->apartment->team
            ->apartmentStatuses()
            ->where('name', 'Продано')
            ->first();

        if ($soldStatus) {
            $reservation->apartment->update(['status_id' => $soldStatus->id]);
        }

        return response()->json([
            'data' => new ReservationResource($reservation),
        ]);
    }
}
