<?php

namespace App\Events;

use App\Models\Note;

class NoteCreated extends BaseModelEvent
{
    public function __construct(public readonly Note $note)
    {
        parent::__construct($note, $note->team_id);
    }
}
