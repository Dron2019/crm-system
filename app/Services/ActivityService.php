<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;

class ActivityService
{
    private const MORPH_MAP = [
        'contact' => \App\Models\Contact::class,
        'company' => \App\Models\Company::class,
        'deal' => \App\Models\Deal::class,
    ];

    public function list(Request $request): LengthAwarePaginator
    {
        return Activity::query()
            ->where('team_id', $request->user()->current_team_id)
            ->when($request->input('type'), fn ($q, $type) => $q->where('type', $type))
            ->when($request->input('subject_type'), fn ($q, $type) => $q->where('subject_type', $type))
            ->when($request->input('subject_id'), fn ($q, $id) => $q->where('subject_id', $id))
            ->when($request->boolean('upcoming'), fn ($q) => $q->whereNull('completed_at')->where('scheduled_at', '>=', now()))
            ->when($request->boolean('overdue'), fn ($q) => $q->whereNull('completed_at')->where('scheduled_at', '<', now()))
            ->with(['user', 'subject'])
            ->orderBy($request->input('sort', 'created_at'), $request->input('direction', 'desc'))
            ->paginate($request->input('per_page', 25));
    }

    public function create(array $validated, User $user): Activity
    {
        $activity = Activity::create([
            ...$validated,
            'subject_type' => self::MORPH_MAP[$validated['subject_type']],
            'team_id' => $user->current_team_id,
            'user_id' => $user->id,
        ]);

        return $activity->load(['user', 'subject']);
    }

    public function update(Activity $activity, array $validated): Activity
    {
        $activity->update($validated);

        return $activity->load(['user', 'subject']);
    }

    public function delete(Activity $activity): void
    {
        $activity->delete();
    }
}
