<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\ActivityResource;
use App\Http\Resources\DealResource;
use App\Http\Resources\NoteResource;
use App\Models\Contact;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ContactNestedController extends Controller
{
    public function activities(Request $request, Contact $contact): AnonymousResourceCollection
    {
        $activities = $contact->activities()
            ->with(['user'])
            ->orderByDesc('created_at')
            ->paginate($request->input('per_page', 25));

        return ActivityResource::collection($activities);
    }

    public function deals(Request $request, Contact $contact): AnonymousResourceCollection
    {
        $deals = $contact->deals()
            ->with(['pipeline', 'stage', 'assignedTo', 'tags'])
            ->orderByDesc('created_at')
            ->paginate($request->input('per_page', 25));

        return DealResource::collection($deals);
    }

    public function notes(Request $request, Contact $contact): AnonymousResourceCollection
    {
        $notes = $contact->notes()
            ->with(['user'])
            ->orderByDesc('is_pinned')
            ->orderByDesc('created_at')
            ->paginate($request->input('per_page', 25));

        return NoteResource::collection($notes);
    }

    public function timeline(Request $request, Contact $contact): JsonResponse
    {
        $activities = $contact->activities()
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

        $notes = $contact->notes()
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

        $deals = $contact->deals()
            ->get()
            ->map(fn ($d) => [
                'id' => $d->id,
                'type' => 'deal',
                'subtype' => $d->status,
                'title' => "Deal: {$d->title}",
                'description' => "{$d->currency} " . number_format((float)$d->value, 2) . " · {$d->status}",
                'user' => null,
                'occurred_at' => $d->created_at->toISOString(),
            ]);

        $timeline = $activities->concat($notes)->concat($deals)
            ->sortByDesc('occurred_at')
            ->values();

        return response()->json(['data' => $timeline]);
    }

    public function restore(Contact $contact): JsonResponse
    {
        $contact->restore();

        return response()->json([
            'data' => new \App\Http\Resources\ContactResource($contact),
            'message' => 'Contact restored successfully.',
        ]);
    }
}
