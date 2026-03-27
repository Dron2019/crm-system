<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\CompanyResource;
use App\Http\Resources\ContactResource;
use App\Http\Resources\DealResource;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Deal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $query = $request->input('q', '');

        if (strlen($query) < 2) {
            return response()->json(['data' => [
                'contacts' => [],
                'companies' => [],
                'deals' => [],
            ]]);
        }

        $limit = min((int) $request->input('limit', 5), 20);

        $contacts = Contact::search($query)
            ->take($limit)
            ->get();

        $companies = Company::search($query)
            ->take($limit)
            ->get();

        $deals = Deal::search($query)
            ->take($limit)
            ->get();

        return response()->json([
            'data' => [
                'contacts' => ContactResource::collection($contacts),
                'companies' => CompanyResource::collection($companies),
                'deals' => DealResource::collection($deals),
            ],
        ]);
    }
}
