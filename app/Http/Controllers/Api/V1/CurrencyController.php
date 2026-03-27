<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\CurrencyResource;
use App\Models\Currency;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CurrencyController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return CurrencyResource::collection(
            Currency::where('is_active', true)->orderBy('code')->get()
        );
    }

    public function store(Request $request): CurrencyResource
    {
        $this->requireOwner($request);

        $validated = $request->validate([
            'code'   => 'required|string|size:3|unique:currencies,code',
            'name'   => 'required|string|max:100',
            'symbol' => 'required|string|max:10',
            'rate'   => 'required|numeric|min:0.000001',
        ]);

        $validated['code'] = strtoupper($validated['code']);

        return new CurrencyResource(Currency::create($validated));
    }

    public function update(Request $request, Currency $currency): CurrencyResource
    {
        $this->requireOwner($request);

        $validated = $request->validate([
            'name'      => 'sometimes|string|max:100',
            'symbol'    => 'sometimes|string|max:10',
            'rate'      => 'sometimes|numeric|min:0.000001',
            'is_active' => 'sometimes|boolean',
        ]);

        $currency->update($validated);

        return new CurrencyResource($currency->fresh());
    }

    public function destroy(Request $request, Currency $currency): Response
    {
        $this->requireOwner($request);

        if ($currency->code === 'USD') {
            abort(422, 'Cannot delete the USD base currency.');
        }

        $currency->delete();

        return response()->noContent();
    }

    public function refreshRates(Request $request): JsonResponse
    {
        $this->requireOwner($request);

        try {
            $response = Http::timeout(10)->get('https://open.er-api.com/v6/latest/USD');

            if ($response->ok()) {
                $rates   = $response->json('rates', []);
                $updated = 0;

                Currency::all()->each(function (Currency $currency) use ($rates, &$updated) {
                    if (isset($rates[$currency->code])) {
                        $currency->update(['rate' => (float) $rates[$currency->code]]);
                        $updated++;
                    }
                });

                return response()->json(['message' => "Updated {$updated} exchange rates successfully."]);
            }
        } catch (\Exception $e) {
            Log::warning('Exchange rate refresh failed: ' . $e->getMessage());
        }

        return response()->json(
            ['message' => 'Could not fetch live rates. Please update rates manually.'],
            422
        );
    }

    private function requireOwner(Request $request): void
    {
        $user  = $request->user();
        $team  = $user->currentTeam;
        $role  = $team
            ? optional($team->members()->where('user_id', $user->id)->first())->pivot->role
            : null;

        if ($role !== 'owner' && !$user->is_system_admin) {
            abort(403, 'Only team owners can manage currencies.');
        }
    }
}
