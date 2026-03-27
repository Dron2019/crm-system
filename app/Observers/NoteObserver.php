<?php

namespace App\Observers;

use App\Events\NoteCreated;
use App\Models\Note;

class NoteObserver
{
    public function created(Note $note): void
    {
        NoteCreated::dispatch($note);
    }
}
