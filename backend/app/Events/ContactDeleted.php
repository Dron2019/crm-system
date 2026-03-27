<?php

namespace App\Events;

use App\Models\Contact;

class ContactDeleted extends BaseModelEvent
{
    public function __construct(public readonly Contact $contact)
    {
        parent::__construct($contact, $contact->team_id);
    }
}
