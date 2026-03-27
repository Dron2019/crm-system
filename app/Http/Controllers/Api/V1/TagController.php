<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Tag\StoreTagRequest;
use App\Http\Requests\Tag\UpdateTagRequest;
use App\Http\Resources\TagResource;
use App\Models\Tag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TagController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $tags = Tag::orderBy('name')->get();

        return TagResource::collection($tags);
    }

    public function store(StoreTagRequest $request): JsonResponse
    {
        $tag = Tag::create([
            ...$request->validated(),
            'team_id' => $request->user()->current_team_id,
        ]);

        return response()->json([
            'data' => new TagResource($tag),
        ], 201);
    }

    public function update(UpdateTagRequest $request, Tag $tag): JsonResponse
    {
        $tag->update($request->validated());

        return response()->json([
            'data' => new TagResource($tag),
        ]);
    }

    public function destroy(Tag $tag): JsonResponse
    {
        $tag->delete();

        return response()->json(null, 204);
    }
}
