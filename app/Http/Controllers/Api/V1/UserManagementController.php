<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Team;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class UserManagementController extends Controller
{
    private function isAdmin(Request $request): bool
    {
        $user = $request->user();

        // System admins always have access
        if ($user->is_system_admin) {
            return true;
        }

        $team = $user->currentTeam;

        // Team owner has access
        if ($team && $team->owner_id === $user->id) {
            return true;
        }

        // Check role
        $role = $user->roleInCurrentTeam();
        return $role === 'admin' || $role === 'owner';
    }

    public function index(Request $request): JsonResponse
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $users = User::with('teams')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_active' => $user->is_active,
                'is_system_admin' => $user->is_system_admin,
                'deactivated_at' => $user->deactivated_at,
                'deactivation_reason' => $user->deactivation_reason,
                'created_at' => $user->created_at,
                'teams' => $user->teams->map(fn (Team $team) => [
                    'id' => $team->id,
                    'name' => $team->name,
                    'role' => $team->owner_id === $user->id ? 'owner' : ($team->pivot->role ?? 'member'),
                ]),
            ]);

        return response()->json([
            'data' => $users,
        ]);
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $tempPassword = Str::random(12);

        $user->update([
            'password' => Hash::make($tempPassword),
        ]);

        return response()->json([
            'message' => 'Password reset successfully',
            'temporary_password' => $tempPassword,
        ]);
    }

    public function deactivate(Request $request, User $user): JsonResponse
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($request->user()->id === $user->id) {
            return response()->json(['message' => 'Cannot deactivate yourself.'], 422);
        }

        $user->update([
            'is_active' => false,
            'deactivation_reason' => $request->input('reason', 'Deactivated by admin'),
            'deactivated_by' => $request->user()->id,
            'deactivated_at' => now(),
        ]);

        // Invalidate all sessions
        \DB::table('sessions')->where('user_id', $user->id)->delete();

        return response()->json([
            'message' => 'User deactivated successfully',
            'data' => [
                'id' => $user->id,
                'is_active' => $user->is_active,
                'deactivated_at' => $user->deactivated_at,
            ],
        ]);
    }

    public function activate(Request $request, User $user): JsonResponse
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $user->update([
            'is_active' => true,
            'deactivated_at' => null,
            'deactivation_reason' => null,
            'deactivated_by' => null,
        ]);

        return response()->json([
            'message' => 'User activated successfully',
            'data' => [
                'id' => $user->id,
                'is_active' => $user->is_active,
            ],
        ]);
    }

    public function updateRole(Request $request, User $user): JsonResponse
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($request->user()->id === $user->id) {
            return response()->json(['message' => 'Cannot change your own system role.'], 422);
        }

        $validated = $request->validate([
            'is_system_admin' => 'required|boolean',
        ]);

        $user->update([
            'is_system_admin' => $validated['is_system_admin'],
        ]);

        return response()->json([
            'message' => 'User role updated successfully',
            'data' => [
                'id' => $user->id,
                'is_system_admin' => $user->is_system_admin,
            ],
        ]);
    }

    public function teams(Request $request): JsonResponse
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $teams = Team::with(['owner', 'members'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn (Team $team) => [
                'id' => $team->id,
                'name' => $team->name,
                'slug' => $team->slug,
                'owner' => $team->owner ? [
                    'id' => $team->owner->id,
                    'name' => $team->owner->name,
                    'email' => $team->owner->email,
                ] : null,
                'members_count' => $team->members->count(),
                'members' => $team->members->map(fn (User $member) => [
                    'id' => $member->id,
                    'name' => $member->name,
                    'email' => $member->email,
                    'is_active' => $member->is_active,
                    'role' => $team->owner_id === $member->id
                        ? 'owner'
                        : ($member->pivot->role ?? 'member'),
                ]),
                'created_at' => $team->created_at,
            ]);

        return response()->json(['data' => $teams]);
    }
}
