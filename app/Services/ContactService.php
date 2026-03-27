<?php

namespace App\Services;

use App\Models\Contact;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;

class ContactService
{
    public function list(Request $request): LengthAwarePaginator
    {
        $query = Contact::query()
            ->when($request->input('search'), fn ($q, $search) => $q->where(function ($q) use ($search) {
                $q->where('first_name', 'LIKE', "%{$search}%")
                  ->orWhere('last_name', 'LIKE', "%{$search}%")
                  ->orWhere('email', 'LIKE', "%{$search}%");
            }))
            ->when($request->input('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->input('assigned_to'), fn ($q, $userId) => $q->where('assigned_to', $userId))
            ->when($request->input('source'), fn ($q, $source) => $q->where('source', $source))
            ->with(['companies', 'assignedTo', 'tags']);

        $fieldFilters = [
            'first_name' => 'f_first_name',
            'last_name' => 'f_last_name',
            'email' => 'f_email',
            'phone' => 'f_phone',
            'mobile' => 'f_mobile',
            'job_title' => 'f_job_title',
            'avatar_url' => 'f_avatar_url',
            'source' => 'f_source',
            'status' => 'f_status',
            'last_contacted_at' => 'f_last_contacted_at',
            'created_at' => 'f_created_at',
        ];

        foreach ($fieldFilters as $column => $param) {
            $value = trim((string) $request->input($param, ''));
            if ($value === '') {
                continue;
            }

            $query->where($column, 'LIKE', "%{$value}%");
        }

        $assignedTo = trim((string) $request->input('f_assigned_to', ''));
        if ($assignedTo !== '') {
            $query->where('assigned_to', $assignedTo);
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

            // Partial match against JSON custom_fields value.
            $query->whereRaw(
                'LOWER(JSON_UNQUOTE(JSON_EXTRACT(custom_fields, ?))) LIKE ?',
                ["$.{$fieldName}", '%' . strtolower($filterValue) . '%']
            );
        }

        $sort = $request->input('sort', 'created_at');
        $direction = strtolower((string) $request->input('direction', 'desc')) === 'asc' ? 'asc' : 'desc';
        $allowedSorts = ['created_at', 'first_name', 'last_name', 'email', 'status'];

        if (!in_array($sort, $allowedSorts, true)) {
            $sort = 'created_at';
        }

        return $query
            ->orderBy($sort, $direction)
            ->paginate($request->input('per_page', 25));
    }

    public function create(array $validated, ?array $companyIds = null, ?array $tagIds = null): Contact
    {
        $contact = Contact::create($validated);

        if ($companyIds !== null) {
            $contact->companies()->sync($companyIds);
        }

        if ($tagIds !== null) {
            $contact->tags()->sync($tagIds);
        }

        return $contact->load(['companies', 'assignedTo', 'tags']);
    }

    public function update(Contact $contact, array $validated, ?array $companyIds = null, ?array $tagIds = null): Contact
    {
        $contact->update($validated);

        if ($companyIds !== null) {
            $contact->companies()->sync($companyIds);
        }

        if ($tagIds !== null) {
            $contact->tags()->sync($tagIds);
        }

        return $contact->load(['companies', 'assignedTo', 'tags']);
    }

    public function delete(Contact $contact): void
    {
        $contact->delete();
    }
}
