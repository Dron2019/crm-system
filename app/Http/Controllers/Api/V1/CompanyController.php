<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Company\StoreCompanyRequest;
use App\Http\Requests\Company\UpdateCompanyRequest;
use App\Http\Resources\CompanyResource;
use App\Models\Company;
use App\Services\CompanyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CompanyController extends Controller
{
    public function __construct(
        private readonly CompanyService $companyService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $companies = $this->companyService->list($request);

        return CompanyResource::collection($companies);
    }

    public function store(StoreCompanyRequest $request): JsonResponse
    {
        $company = $this->companyService->create(
            $request->validated(),
            $request->input('tag_ids'),
        );

        return response()->json([
            'data' => new CompanyResource($company),
        ], 201);
    }

    public function show(Company $company): JsonResponse
    {
        return response()->json([
            'data' => new CompanyResource(
                $company->load(['contacts', 'deals', 'tags', 'activities', 'notes'])
            ),
        ]);
    }

    public function update(UpdateCompanyRequest $request, Company $company): JsonResponse
    {
        $company = $this->companyService->update(
            $company,
            $request->validated(),
            $request->input('tag_ids'),
        );

        return response()->json([
            'data' => new CompanyResource($company),
        ]);
    }

    public function destroy(Company $company): JsonResponse
    {
        $this->companyService->delete($company);

        return response()->json(null, 204);
    }
}
