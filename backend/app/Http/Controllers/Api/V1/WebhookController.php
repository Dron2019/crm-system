<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Webhook;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class WebhookController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $webhooks = Webhook::where('team_id', $request->user()->current_team_id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $webhooks]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'url' => ['required', 'url', 'max:2048'],
            'events' => ['required', 'array', 'min:1'],
            'events.*' => ['required', 'string'],
        ]);

        $webhook = Webhook::create([
            'team_id' => $request->user()->current_team_id,
            'url' => $validated['url'],
            'events' => $validated['events'],
            'secret' => Str::random(64),
        ]);

        return response()->json(['data' => $webhook], 201);
    }

    public function update(Request $request, Webhook $webhook): JsonResponse
    {
        $validated = $request->validate([
            'url' => ['sometimes', 'url', 'max:2048'],
            'events' => ['sometimes', 'array', 'min:1'],
            'events.*' => ['sometimes', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $webhook->update($validated);

        return response()->json(['data' => $webhook]);
    }

    public function destroy(Webhook $webhook): JsonResponse
    {
        $webhook->delete();

        return response()->json(null, 204);
    }
}
