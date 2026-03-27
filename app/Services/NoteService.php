<?php

namespace App\Services;

use App\Models\Note;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;

class NoteService
{
    private const MORPH_MAP = [
        'contact' => \App\Models\Contact::class,
        'company' => \App\Models\Company::class,
        'deal' => \App\Models\Deal::class,
        'activity' => \App\Models\Activity::class,
    ];

    public function list(Request $request): LengthAwarePaginator
    {
        return Note::query()
            ->where('team_id', $request->user()->current_team_id)
            ->when($request->input('notable_type'), fn ($q, $type) => $q->where('notable_type', $type))
            ->when($request->input('notable_id'), fn ($q, $id) => $q->where('notable_id', $id))
            ->with(['user'])
            ->orderByDesc('is_pinned')
            ->orderByDesc('created_at')
            ->paginate($request->input('per_page', 25));
    }

    public function create(array $validated, User $user): Note
    {
        $note = Note::create([
            ...$validated,
            'notable_type' => self::MORPH_MAP[$validated['notable_type']],
            'team_id' => $user->current_team_id,
            'user_id' => $user->id,
        ]);

        return $note->load('user');
    }

    public function update(Note $note, array $validated): Note
    {
        $note->update($validated);

        return $note->load('user');
    }

    public function delete(Note $note): void
    {
        $note->delete();
    }
}
