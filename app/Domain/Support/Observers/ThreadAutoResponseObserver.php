<?php

namespace App\Domain\Support\Observers;

use App\Domain\Support\Services\AutoResponseDispatcher;
use App\Domain\Thread\Models\Thread;

class ThreadAutoResponseObserver
{
    public function created(Thread $thread): void
    {
        app(AutoResponseDispatcher::class)->dispatchFor($thread);
    }
}
