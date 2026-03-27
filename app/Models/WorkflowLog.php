<?php

namespace App\Models;

use App\Domain\Shared\Traits\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkflowLog extends Model
{
    use HasUuidPrimaryKey;

    protected $fillable = [
        'workflow_id',
        'trigger_entity_id',
        'trigger_entity_type',
        'status',
        'action_results',
        'error_message',
    ];

    protected function casts(): array
    {
        return [
            'action_results' => 'array',
        ];
    }

    public function workflow(): BelongsTo
    {
        return $this->belongsTo(Workflow::class);
    }
}
