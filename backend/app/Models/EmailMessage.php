<?php

namespace App\Models;

use App\Domain\Shared\Traits\BelongsToTeam;
use App\Domain\Shared\Traits\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailMessage extends Model
{
    use BelongsToTeam, HasUuidPrimaryKey;

    protected $fillable = [
        'team_id',
        'email_account_id',
        'message_id',
        'thread_id',
        'subject',
        'from_email',
        'from_name',
        'to_recipients',
        'cc_recipients',
        'bcc_recipients',
        'body_html',
        'body_text',
        'direction',
        'status',
        'is_read',
        'is_starred',
        'contact_id',
        'deal_id',
        'sent_at',
    ];

    protected function casts(): array
    {
        return [
            'to_recipients' => 'array',
            'cc_recipients' => 'array',
            'bcc_recipients' => 'array',
            'is_read' => 'boolean',
            'is_starred' => 'boolean',
            'sent_at' => 'datetime',
        ];
    }

    public function emailAccount(): BelongsTo
    {
        return $this->belongsTo(EmailAccount::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function deal(): BelongsTo
    {
        return $this->belongsTo(Deal::class);
    }
}
