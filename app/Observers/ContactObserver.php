<?php

namespace App\Observers;

use App\Events\ContactCreated;
use App\Events\ContactDeleted;
use App\Events\ContactUpdated;
use App\Models\Contact;

class ContactObserver
{
    public function created(Contact $contact): void
    {
        ContactCreated::dispatch($contact);
    }

    public function updated(Contact $contact): void
    {
        $changed = $contact->getChanges();
        unset($changed['updated_at']);

        if (!empty($changed)) {
            ContactUpdated::dispatch($contact, $changed);
        }
    }

    public function deleted(Contact $contact): void
    {
        ContactDeleted::dispatch($contact);
    }
}
