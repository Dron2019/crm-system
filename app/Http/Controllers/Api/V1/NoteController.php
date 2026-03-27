<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Note\StoreNoteRequest;
use App\Http\Requests\Note\UpdateNoteRequest;
use App\Http\Resources\NoteResource;
use App\Models\Note;
use App\Services\NoteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class NoteController extends Controller
{
    public function __construct(
        private readonly NoteService $noteService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $notes = $this->noteService->list($request);

        return NoteResource::collection($notes);
    }

    public function store(StoreNoteRequest $request): JsonResponse
    {
        $note = $this->noteService->create($request->validated(), $request->user());

        return response()->json([
            'data' => new NoteResource($note),
        ], 201);
    }

    public function update(UpdateNoteRequest $request, Note $note): JsonResponse
    {
        $note = $this->noteService->update($note, $request->validated());

        return response()->json([
            'data' => new NoteResource($note),
        ]);
    }

    public function destroy(Note $note): JsonResponse
    {
        $this->noteService->delete($note);

        return response()->json(null, 204);
    }

    public function pin(Note $note): JsonResponse
    {
        $note->update(['is_pinned' => !$note->is_pinned]);

        return response()->json([
            'data' => new NoteResource($note->load('user')),
        ]);
    }
}
