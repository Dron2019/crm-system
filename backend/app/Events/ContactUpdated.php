<?php

namespace App\Events;

use App\Models\Contact;

class ContactUpdated extends BaseModelEvent
{
    public function __construct(
        public readonly Contact $contact,
        public readonly array $changedAttributes = [],
    ) {
        parent::__construct($contact, $contact->team_id);
    }
}
