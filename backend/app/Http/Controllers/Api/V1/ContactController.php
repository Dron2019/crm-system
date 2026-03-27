<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Contact\StoreContactRequest;
use App\Http\Requests\Contact\UpdateContactRequest;
use App\Http\Resources\ContactResource;
use App\Models\Contact;
use App\Services\ContactService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ContactController extends Controller
{
    public function __construct(
        private readonly ContactService $contactService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $contacts = $this->contactService->list($request);

        return ContactResource::collection($contacts);
    }

    public function store(StoreContactRequest $request): JsonResponse
    {
        $contact = $this->contactService->create(
            $request->validated(),
            $request->input('company_ids'),
            $request->input('tag_ids'),
        );

        return response()->json([
            'data' => new ContactResource($contact),
        ], 201);
    }

    public function show(Contact $contact): JsonResponse
    {
        return response()->json([
            'data' => new ContactResource(
                $contact->load(['companies', 'deals', 'assignedTo', 'tags', 'activities', 'notes'])
            ),
        ]);
    }

    public function update(UpdateContactRequest $request, Contact $contact): JsonResponse
    {
        $contact = $this->contactService->update(
            $contact,
            $request->validated(),
            $request->input('company_ids'),
            $request->input('tag_ids'),
        );

        return response()->json([
            'data' => new ContactResource($contact),
        ]);
    }

    public function destroy(Contact $contact): JsonResponse
    {
        $this->contactService->delete($contact);

        return response()->json(null, 204);
    }
}
