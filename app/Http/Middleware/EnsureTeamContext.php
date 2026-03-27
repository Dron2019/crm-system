<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureTeamContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'error' => [
                    'status' => 401,
                    'code' => 'AUTH_REQUIRED',
                    'message' => 'Authentication required.',
                ],
            ], 401);
        }

        if (!$user->is_active) {
            Auth::guard('web')->logout();
            return response()->json([
                'error' => [
                    'status' => 403,
                    'code' => 'ACCOUNT_DEACTIVATED',
                    'message' => 'Your account has been deactivated. Contact your administrator.',
                ],
            ], 403);
        }

        if (!$user->current_team_id) {
            // Auto-select first team if none selected
            $firstTeam = $user->teams()->first();
            if ($firstTeam) {
                $user->update(['current_team_id' => $firstTeam->id]);
                $user->setRelation('currentTeam', $firstTeam);
            } else {
                return response()->json([
                    'error' => [
                        'status' => 403,
                        'code' => 'TEAM_ACCESS_DENIED',
                        'message' => 'You must belong to a team to access this resource.',
                    ],
                ], 403);
            }
        }

        return $next($request);
    }
}
