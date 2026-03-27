<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\ContactResource;
use App\Http\Resources\DealResource;
use App\Http\Resources\NoteResource;
use App\Http\Resources\ActivityResource;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CompanyNestedController extends Controller
{
    public function contacts(Request $request, Company $company): AnonymousResourceCollection
    {
        $contacts = $company->contacts()
            ->with(['assignedTo', 'tags'])
            ->orderByDesc('created_at')
            ->paginate($request->input('per_page', 25));

        return ContactResource::collection($contacts);
    }

    public function deals(Request $request, Company $company): AnonymousResourceCollection
    {
        $deals = $company->deals()
            ->with(['pipeline', 'stage', 'contact', 'assignedTo', 'tags'])
            ->orderByDesc('created_at')
            ->paginate($request->input('per_page', 25));

        return DealResource::collection($deals);
    }

    public function activities(Request $request, Company $company): AnonymousResourceCollection
    {
        $activities = $company->activities()
            ->with(['user'])
            ->orderByDesc('created_at')
            ->paginate($request->input('per_page', 25));

        return ActivityResource::collection($activities);
    }

    public function notes(Request $request, Company $company): AnonymousResourceCollection
    {
        $notes = $company->notes()
            ->with(['user'])
            ->orderByDesc('is_pinned')
            ->orderByDesc('created_at')
            ->paginate($request->input('per_page', 25));

        return NoteResource::collection($notes);
    }

    public function timeline(Request $request, Company $company): JsonResponse
    {
        $activities = $company->activities()
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

        $notes = $company->notes()
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

        $deals = $company->deals()
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
}
