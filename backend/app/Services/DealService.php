<?php

namespace App\Services;

use App\Models\Deal;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;

class DealService
{
    public function list(Request $request): LengthAwarePaginator
    {
        return Deal::query()
            ->when($request->input('search'), fn ($q, $search) => $q->where('title', 'LIKE', "%{$search}%"))
            ->when($request->input('pipeline_id'), fn ($q, $id) => $q->where('pipeline_id', $id))
            ->when($request->input('stage_id'), fn ($q, $id) => $q->where('stage_id', $id))
            ->when($request->input('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->input('assigned_to'), fn ($q, $userId) => $q->where('assigned_to', $userId))
            ->with(['pipeline', 'stage', 'contact', 'company', 'assignedTo', 'tags'])
            ->orderBy($request->input('sort', 'created_at'), $request->input('direction', 'desc'))
            ->paginate($request->input('per_page', 25));
    }

    public function create(array $validated, ?array $tagIds = null): Deal
    {
        $deal = Deal::create($validated);

        if ($tagIds !== null) {
            $deal->tags()->sync($tagIds);
        }

        return $deal->load(['pipeline', 'stage', 'contact', 'company', 'assignedTo', 'tags']);
    }

    public function update(Deal $deal, array $validated, ?array $tagIds = null): Deal
    {
        $deal->update($validated);

        if ($tagIds !== null) {
            $deal->tags()->sync($tagIds);
        }

        return $deal->load(['pipeline', 'stage', 'contact', 'company', 'assignedTo', 'tags']);
    }

    public function delete(Deal $deal): void
    {
        $deal->delete();
    }

    public function markWon(Deal $deal): Deal
    {
        $deal->update(['status' => 'won']);

        return $deal->load(['pipeline', 'stage', 'contact', 'company', 'assignedTo', 'tags']);
    }

    public function markLost(Deal $deal, ?string $lostReason = null): Deal
    {
        $deal->update([
            'status' => 'lost',
            'lost_reason' => $lostReason,
        ]);

        return $deal->load(['pipeline', 'stage', 'contact', 'company', 'assignedTo', 'tags']);
    }
}
