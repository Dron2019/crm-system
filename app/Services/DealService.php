<?php

namespace App\Services;

use App\Models\Deal;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;

class DealService
{
    public function list(Request $request): LengthAwarePaginator
    {
        $query = Deal::query()
            ->when($request->input('search'), fn ($q, $search) => $q->where('title', 'LIKE', "%{$search}%"))
            ->when($request->input('pipeline_id'), fn ($q, $id) => $q->where('pipeline_id', $id))
            ->when($request->input('stage_id'), fn ($q, $id) => $q->where('stage_id', $id))
            ->when($request->input('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->input('assigned_to'), fn ($q, $userId) => $q->where('assigned_to', $userId))
            ->with(['pipeline', 'stage', 'contact', 'company', 'assignedTo', 'tags']);

        $partialFieldFilters = [
            'title' => 'f_title',
            'value' => 'f_value',
            'currency' => 'f_currency',
            'expected_close_date' => 'f_expected_close_date',
            'probability' => 'f_probability',
            'status' => 'f_status',
            'lost_reason' => 'f_lost_reason',
            'created_at' => 'f_created_at',
        ];

        foreach ($partialFieldFilters as $column => $param) {
            $value = trim((string) $request->input($param, ''));
            if ($value === '') {
                continue;
            }

            $query->where($column, 'LIKE', "%{$value}%");
        }

        $exactFieldFilters = [
            'stage_id' => 'f_stage_id',
            'contact_id' => 'f_contact_id',
            'company_id' => 'f_company_id',
            'assigned_to' => 'f_assigned_to',
        ];

        foreach ($exactFieldFilters as $column => $param) {
            $value = trim((string) $request->input($param, ''));
            if ($value === '') {
                continue;
            }

            $query->where($column, $value);
        }

        foreach ($request->query() as $key => $value) {
            if (!str_starts_with($key, 'cf_')) {
                continue;
            }

            $filterValue = trim((string) $value);
            if ($filterValue === '') {
                continue;
            }

            $fieldName = substr($key, 3);
            if (!preg_match('/^[A-Za-z0-9_\-]+$/', $fieldName)) {
                continue;
            }

            $jsonPath = "$.{$fieldName}";
            $options = str_contains($filterValue, '||')
                ? array_values(array_filter(array_map('trim', explode('||', $filterValue))))
                : [$filterValue];

            if (count($options) > 1) {
                $query->where(function ($sub) use ($jsonPath, $options) {
                    foreach ($options as $option) {
                        $sub->orWhereRaw(
                            'JSON_CONTAINS(JSON_EXTRACT(custom_fields, ?), JSON_QUOTE(?))',
                            [$jsonPath, $option]
                        )->orWhereRaw(
                            'LOWER(JSON_UNQUOTE(JSON_EXTRACT(custom_fields, ?))) LIKE ?',
                            [$jsonPath, '%' . strtolower($option) . '%']
                        );
                    }
                });
                continue;
            }

            $query->whereRaw(
                'LOWER(JSON_UNQUOTE(JSON_EXTRACT(custom_fields, ?))) LIKE ?',
                [$jsonPath, '%' . strtolower($filterValue) . '%']
            );
        }

        $sort = $request->input('sort', 'created_at');
        $direction = strtolower((string) $request->input('direction', 'desc')) === 'asc' ? 'asc' : 'desc';
        $allowedSorts = ['created_at', 'title', 'value', 'probability', 'expected_close_date', 'status'];

        if (!in_array($sort, $allowedSorts, true)) {
            $sort = 'created_at';
        }

        return $query
            ->orderBy($sort, $direction)
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
