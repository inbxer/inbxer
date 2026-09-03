<?php

namespace App\Domain\Support\Controllers;

use App\Domain\Support\Models\CsatSurvey;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Public, token-based CSAT survey pages — no login required, matching a
 * link a customer receives by email after their thread is resolved.
 */
class CsatController extends Controller
{
    public function show(Request $request, CsatSurvey $survey): Response
    {
        // A rating clicked directly from the email link (?rating=4) is
        // recorded immediately so the page can show a thank-you state and
        // still offer to add an optional comment.
        $quickRating = $request->integer('rating');

        if ($survey->responded_at === null && $quickRating >= 1 && $quickRating <= 5) {
            $survey->update(['rating' => $quickRating, 'responded_at' => now()]);
        }

        return Inertia::render('csat/show', [
            'survey' => [
                'token' => $survey->token,
                'rating' => $survey->rating,
                'comment' => $survey->comment,
                'responded' => $survey->responded_at !== null,
            ],
        ]);
    }

    public function store(Request $request, CsatSurvey $survey): RedirectResponse
    {
        $validated = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:2000',
        ]);

        $survey->update([
            'rating' => $validated['rating'],
            'comment' => $validated['comment'] ?? $survey->comment,
            'responded_at' => $survey->responded_at ?? now(),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Thanks for your feedback!']);

        return redirect()->back();
    }
}
