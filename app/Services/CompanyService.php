<?php

namespace App\Services;

use App\Models\Company;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;

class CompanyService
{
    public function list(Request $request): LengthAwarePaginator
    {
        return Company::query()
            ->when($request->input('search'), fn ($q, $search) => $q->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('domain', 'LIKE', "%{$search}%");
            }))
            ->when($request->input('industry'), fn ($q, $industry) => $q->where('industry', $industry))
            ->with(['contacts', 'tags'])
            ->orderBy($request->input('sort', 'created_at'), $request->input('direction', 'desc'))
            ->paginate($request->input('per_page', 25));
    }

    public function create(array $validated, ?array $tagIds = null): Company
    {
        $company = Company::create($validated);

        if ($tagIds !== null) {
            $company->tags()->sync($tagIds);
        }

        return $company->load(['contacts', 'tags']);
    }

    public function update(Company $company, array $validated, ?array $tagIds = null): Company
    {
        $company->update($validated);

        if ($tagIds !== null) {
            $company->tags()->sync($tagIds);
        }

        return $company->load(['contacts', 'tags']);
    }

    public function delete(Company $company): void
    {
        $company->delete();
    }
}
