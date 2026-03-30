<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\ActivityResource;
use App\Http\Resources\NoteResource;
use App\Http\Resources\DealResource;
use App\Models\AuditLog;
use App\Models\Deal;
use App\Models\Stage;
use App\Services\DealService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DealActionController extends Controller
{
    public function __construct(
        private readonly DealService $dealService,
    ) {}

    public function move(Request $request, Deal $deal): JsonResponse
    {
        $validated = $request->validate([
            'stage_id' => 'required|uuid|exists:stages,id',
        ]);

        $stage = Stage::findOrFail($validated['stage_id']);

        $deal->update(['stage_id' => $stage->id]);

        return response()->json([
            'data' => new DealResource(
                $deal->load(['pipeline', 'stage', 'contact', 'company', 'assignedTo', 'tags'])
            ),
        ]);
    }

    public function won(Deal $deal): JsonResponse
    {
        $deal = $this->dealService->markWon($deal);

        return response()->json([
            'data' => new DealResource($deal),
        ]);
    }

    public function lost(Request $request, Deal $deal): JsonResponse
    {
        $validated = $request->validate([
            'lost_reason' => 'nullable|string|max:1000',
        ]);

        $deal = $this->dealService->markLost($deal, $validated['lost_reason'] ?? null);

        return response()->json([
            'data' => new DealResource($deal),
        ]);
    }

    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'deals' => 'required|array',
            'deals.*.id' => 'required|uuid|exists:deals,id',
            'deals.*.stage_id' => 'required|uuid|exists:stages,id',
            'deals.*.position' => 'required|integer|min:0',
        ]);

        foreach ($validated['deals'] as $item) {
            Deal::where('id', $item['id'])->update([
                'stage_id' => $item['stage_id'],
                'position' => $item['position'],
            ]);
        }

        return response()->json(['message' => 'Deals reordered successfully.']);
    }

    public function timeline(Request $request, Deal $deal): JsonResponse
    {
        $activities = $deal->activities()
            ->with('user')
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'type' => 'activity',
                'subtype' => $a->type,
                'title' => $a->title,
                'description' => $a->description,
                'user' => $a->user?->name,
                'occurred_at' => $a->created_at->toISOString(),
            ]);

        $notes = $deal->notes()
            ->with('user')
            ->get()
            ->map(fn ($n) => [
                'id' => $n->id,
                'type' => 'note',
                'subtype' => $n->is_pinned ? 'pinned' : 'note',
                'title' => 'Note added',
                'description' => \Illuminate\Support\Str::limit($n->body, 200),
                'user' => $n->user?->name,
                'occurred_at' => $n->created_at->toISOString(),
            ]);

        $auditEvents = AuditLog::query()
            ->where('auditable_type', $deal->getMorphClass())
            ->where('auditable_id', $deal->id)
            ->whereIn('action', ['apartment_attached', 'apartment_detached'])
            ->with('user')
            ->get()
            ->map(function (AuditLog $log) {
                $metadata = $log->new_values ?? [];
                $number = $metadata['apartment_number'] ?? 'N/A';
                $building = $metadata['building_name'] ?? null;
                $verb = $log->action === 'apartment_attached' ? 'attached' : 'detached';
                $title = $log->action === 'apartment_attached'
                    ? 'Apartment attached'
                    : 'Apartment detached';

                return [
                    'id' => $log->id,
                    'type' => 'audit',
                    'subtype' => $log->action,
                    'title' => $title,
                    'description' => $building
                        ? "Apartment #{$number} ({$building}) {$verb} to deal"
                        : "Apartment #{$number} {$verb} to deal",
                    'user' => $log->user?->name,
                    'occurred_at' => $log->created_at?->toISOString(),
                ];
            });

        $timeline = $activities->concat($notes)->concat($auditEvents)
            ->sortByDesc('occurred_at')
            ->values();

        return response()->json(['data' => $timeline]);
    }

    public function activities(Request $request, Deal $deal): AnonymousResourceCollection
    {
        $activities = $deal->activities()
            ->with(['user'])
            ->orderByDesc('created_at')
            ->paginate($request->input('per_page', 25));

        return ActivityResource::collection($activities);
    }

    public function notes(Request $request, Deal $deal): AnonymousResourceCollection
    {
        $notes = $deal->notes()
            ->with(['user'])
            ->orderByDesc('is_pinned')
            ->orderByDesc('created_at')
            ->paginate($request->input('per_page', 25));

        return NoteResource::collection($notes);
    }
}
