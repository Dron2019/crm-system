<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Attachment\StoreAttachmentRequest;
use App\Http\Resources\AttachmentResource;
use App\Models\Attachment;
use App\Services\FileUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttachmentController extends Controller
{
    public function __construct(
        private readonly FileUploadService $uploadService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $attachments = Attachment::query()
            ->where('team_id', $request->user()->current_team_id)
            ->when($request->input('attachable_type'), fn ($q, $type) => $q->where('attachable_type', $type))
            ->when($request->input('attachable_id'), fn ($q, $id) => $q->where('attachable_id', $id))
            ->with('user')
            ->orderByDesc('created_at')
            ->paginate($request->input('per_page', 25));

        return response()->json(AttachmentResource::collection($attachments)->response()->getData(true));
    }

    public function store(StoreAttachmentRequest $request): JsonResponse
    {
        $attachment = $this->uploadService->upload(
            $request->file('file'),
            $request->input('attachable_type'),
            $request->input('attachable_id'),
            $request->user(),
        );

        return response()->json(['data' => new AttachmentResource($attachment->load('user'))], 201);
    }

    public function download(Attachment $attachment): JsonResponse
    {
        $url = $this->uploadService->getDownloadUrl($attachment);

        return response()->json(['data' => ['url' => $url]]);
    }

    public function destroy(Attachment $attachment): JsonResponse
    {
        $this->uploadService->delete($attachment);

        return response()->json(null, 204);
    }
}
