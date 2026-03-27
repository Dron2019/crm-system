<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AuditLogController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $logs = AuditLog::query()
            ->where('team_id', $request->user()->current_team_id)
            ->when($request->input('auditable_type'), fn ($q, $type) => $q->where('auditable_type', $type))
            ->when($request->input('auditable_id'), fn ($q, $id) => $q->where('auditable_id', $id))
            ->when($request->input('action'), fn ($q, $action) => $q->where('action', $action))
            ->when($request->input('user_id'), fn ($q, $userId) => $q->where('user_id', $userId))
            ->with(['user'])
            ->orderByDesc('created_at')
            ->paginate($request->input('per_page', 25));

        return AuditLogResource::collection($logs);
    }
}
