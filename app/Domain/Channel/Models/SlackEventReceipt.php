<?php

namespace App\Domain\Channel\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class SlackEventReceipt extends Model
{
    use HasUlids;

    protected $fillable = ['event_id', 'slack_team_id', 'processed_at', 'error'];

    protected function casts(): array
    {
        return ['processed_at' => 'datetime'];
    }
}
