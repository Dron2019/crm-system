<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Invitation;
use App\Models\Team;
use App\Models\User;
use App\Notifications\TeamInvitationNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

class TeamMemberController extends Controller
{
    private function currentTeamOrFail(Request $request): Team
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
        $team = $this->currentTeamOrFail($request);

        if (!$request->user()->hasPermission('team.view')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $members = $team->members()
            ->withPivot('role')
            ->when(!$this->isAdminOrOwner($request), fn ($q) => $q->where('users.id', $request->user()->id))
            ->orderBy('name')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar_url' => $user->avatar_url,
                'role' => $user->pivot->role,
                'last_login_at' => $user->last_login_at,
            ]);

        return response()->json([
            'data' => $members,
            'meta' => [
                'can_manage_members' => $this->isAdminOrOwner($request),
                'current_user_role' => $request->user()->roleInCurrentTeam(),
            ],
        ]);
    }

    public function invite(Request $request): JsonResponse
    {
        $team = $this->currentTeamOrFail($request);

        if (!$this->isAdminOrOwner($request)) {
            return response()->json(['message' => 'Only owner/admin can invite members.'], 403);
        }

        $validated = $request->validate([
            'email' => 'required|email|max:255',
            'role' => 'sometimes|string|in:admin,member,viewer',
        ]);

        // Check if already a member
        $exists = $team->members()->where('email', $validated['email'])->exists();
        if ($exists) {
            return response()->json(['message' => 'User is already a team member.'], 422);
        }

        // Check for pending invitation
        $pending = Invitation::where('team_id', $team->id)
            ->where('email', $validated['email'])
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->exists();

        if ($pending) {
            return response()->json(['message' => 'An invitation is already pending for this email.'], 422);
        }

        $invitation = Invitation::create([
            'team_id' => $team->id,
            'email' => $validated['email'],
            'role' => $validated['role'] ?? 'member',
            'token' => Str::random(64),
            'invited_by' => $request->user()->id,
            'expires_at' => now()->addDays(7),
        ]);

        try {
            Notification::route('mail', $invitation->email)
                ->notify(new TeamInvitationNotification($invitation, $team, $request->user()));
        } catch (\Throwable $e) {
            Log::error('Failed to send team invitation email', [
                'team_id' => $team->id,
                'email' => $invitation->email,
                'error' => $e->getMessage(),
            ]);

            $invitation->delete();

            return response()->json([
                'message' => 'Invitation email could not be sent. Check mail configuration.',
            ], 500);
        }

        return response()->json([
            'data' => $invitation->load('inviter'),
            'message' => 'Invitation sent.',
        ], 201);
    }

    public function updateRole(Request $request, User $user): JsonResponse
    {
        $team = $this->currentTeamOrFail($request);

        if (!$this->isAdminOrOwner($request)) {
            return response()->json(['message' => 'Only owner/admin can update roles.'], 403);
        }

        $validated = $request->validate([
            'role' => 'required|string|in:admin,member,viewer',
        ]);

        if (!$team->members()->where('users.id', $user->id)->exists()) {
            return response()->json(['message' => 'User is not a team member.'], 404);
        }

        // Cannot change owner role
        if ($team->owner_id === $user->id) {
            return response()->json(['message' => 'Cannot change the team owner\'s role.'], 422);
        }

        $team->members()->updateExistingPivot($user->id, [
            'role' => $validated['role'],
        ]);

        return response()->json(['message' => 'Role updated.']);
    }

    public function remove(Request $request, User $user): JsonResponse
    {
        $team = $this->currentTeamOrFail($request);

        if (!$this->isAdminOrOwner($request)) {
            return response()->json(['message' => 'Only owner/admin can remove members.'], 403);
        }

        if (!$team->members()->where('users.id', $user->id)->exists()) {
            return response()->json(['message' => 'User is not a team member.'], 404);
        }

        // Cannot remove owner
        if ($team->owner_id === $user->id) {
            return response()->json(['message' => 'Cannot remove the team owner.'], 422);
        }

        // Cannot remove yourself
        if ($request->user()->id === $user->id) {
            return response()->json(['message' => 'Cannot remove yourself. Leave the team instead.'], 422);
        }

        $team->members()->detach($user->id);

        // If user's current team was this one, clear it
        if ($user->current_team_id === $team->id) {
            $nextTeam = $user->teams()->first();
            $user->update(['current_team_id' => $nextTeam?->id]);
        }

        return response()->json(null, 204);
    }

    public function pendingInvitations(Request $request): JsonResponse
    {
        $team = $this->currentTeamOrFail($request);

        if (!$this->isAdminOrOwner($request)) {
            return response()->json(['message' => 'Only owner/admin can view invitations.'], 403);
        }

        $invitations = Invitation::where('team_id', $team->id)
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->with('inviter')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $invitations]);
    }

    public function cancelInvitation(Request $request, Invitation $invitation): JsonResponse
    {
        $team = $this->currentTeamOrFail($request);

        if (!$this->isAdminOrOwner($request)) {
            return response()->json(['message' => 'Only owner/admin can cancel invitations.'], 403);
        }

        if ($invitation->team_id !== $team->id) {
            return response()->json(['message' => 'Invitation not found.'], 404);
        }

        $invitation->delete();

        return response()->json(null, 204);
    }
}
