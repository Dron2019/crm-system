<?php

namespace App\Services;

use App\Models\Contact;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;

class ContactService
{
    public function list(Request $request): LengthAwarePaginator
    {
        return Contact::query()
            ->when($request->input('search'), fn ($q, $search) => $q->where(function ($q) use ($search) {
                $q->where('first_name', 'LIKE', "%{$search}%")
                  ->orWhere('last_name', 'LIKE', "%{$search}%")
                  ->orWhere('email', 'LIKE', "%{$search}%");
            }))
            ->when($request->input('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->input('assigned_to'), fn ($q, $userId) => $q->where('assigned_to', $userId))
            ->when($request->input('source'), fn ($q, $source) => $q->where('source', $source))
            ->with(['companies', 'assignedTo', 'tags'])
            ->orderBy($request->input('sort', 'created_at'), $request->input('direction', 'desc'))
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
