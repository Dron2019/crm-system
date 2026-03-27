<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\TeamRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TeamRoleController extends Controller
{
    private function teamOrFail(Request $request)
    {
        $team = $request->user()->currentTeam;
        if (!$team) {
            abort(422, 'No current team selected.');
        }
        return $team;
    }

    private function isAdminOrOwner(Request $request): bool
    {
        $role = $request->user()->roleInCurrentTeam();
        return in_array($role, ['owner', 'admin'], true);
    }

    public function index(Request $request): JsonResponse
    {
        $team = $this->teamOrFail($request);

        $roles = TeamRole::where('team_id', $team->id)
            ->orderBy('name')
            ->get()
            ->map(fn (TeamRole $r) => [
                'id' => $r->id,
                'name' => $r->name,
                'slug' => $r->slug,
                'description' => $r->description,
                'color' => $r->color,
                'permissions' => $r->permissions ?? [],
                'created_at' => $r->created_at,
            ]);

        // Also return the built-in roles from config for reference
        $builtIn = collect(config('crm.roles', []))->map(fn ($def, $key) => [
            'id' => $key,
            'name' => $def['label'],
            'slug' => $key,
            'description' => null,
            'color' => match ($key) {
                'owner' => '#dc2626',
                'admin' => '#6366f1',
                'member' => '#64748b',
                'viewer' => '#94a3b8',
                default => '#6366f1',
            },
            'permissions' => $def['permissions'],
            'is_builtin' => true,
        ])->values();

        return response()->json([
            'data' => $roles,
            'builtin' => $builtIn,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $team = $this->teamOrFail($request);

        if (!$this->isAdminOrOwner($request)) {
            return response()->json(['message' => 'Only owner/admin can create roles.'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string|max:500',
            'color' => 'nullable|string|max:20',
            'permissions' => 'required|array',
            'permissions.*' => 'string',
        ]);

        $slug = Str::slug($validated['name']);
        $base = $slug;
        $i = 2;
        while (TeamRole::where('team_id', $team->id)->where('slug', $slug)->exists()) {
            $slug = $base . '-' . $i++;
        }

        // Reject built-in role slugs
        $builtIn = array_keys(config('crm.roles', []));
        if (in_array($slug, $builtIn, true)) {
            return response()->json(['message' => 'Role name conflicts with a built-in role.'], 422);
        }

        $role = TeamRole::create([
            'team_id' => $team->id,
            'name' => $validated['name'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'color' => $validated['color'] ?? '#6366f1',
            'permissions' => $validated['permissions'],
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $role], 201);
    }

    public function update(Request $request, TeamRole $teamRole): JsonResponse
    {
        $team = $this->teamOrFail($request);

        if (!$this->isAdminOrOwner($request)) {
            return response()->json(['message' => 'Only owner/admin can update roles.'], 403);
        }

        if ($teamRole->team_id !== $team->id) {
            return response()->json(['message' => 'Role not found.'], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'description' => 'nullable|string|max:500',
            'color' => 'nullable|string|max:20',
            'permissions' => 'sometimes|array',
            'permissions.*' => 'string',
        ]);

        $teamRole->update($validated);

        return response()->json(['data' => $teamRole->fresh()]);
    }

    public function destroy(Request $request, TeamRole $teamRole): JsonResponse
    {
        $team = $this->teamOrFail($request);

        if (!$this->isAdminOrOwner($request)) {
            return response()->json(['message' => 'Only owner/admin can delete roles.'], 403);
        }

        if ($teamRole->team_id !== $team->id) {
            return response()->json(['message' => 'Role not found.'], 404);
        }

        // Clear custom_role_id on any members using this role before deleting
        \DB::table('team_members')
            ->where('custom_role_id', $teamRole->id)
            ->update(['custom_role_id' => null, 'role' => 'member']);

        $teamRole->delete();

        return response()->json(null, 204);
    }
}
