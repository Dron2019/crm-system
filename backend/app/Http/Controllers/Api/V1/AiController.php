<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\Deal;
use App\Services\AiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiController extends Controller
{
    public function __construct(private AiService $ai) {}

    public function scoreContact(Contact $contact): JsonResponse
    {
        $this->authorize('view', $contact);

        return response()->json($this->ai->scoreContact($contact));
    }

    public function draftEmail(Request $request, Contact $contact): JsonResponse
    {
        $this->authorize('view', $contact);

        $validated = $request->validate([
            'purpose' => ['sometimes', 'string', 'in:follow_up,introduction,deal_proposal,check_in'],
        ]);

        return response()->json($this->ai->draftEmail($contact, $validated['purpose'] ?? 'follow_up'));
    }

    public function summarizeDeal(Deal $deal): JsonResponse
    {
        $this->authorize('view', $deal);

        return response()->json($this->ai->summarizeDeal($deal));
    }

    public function suggestActions(Contact $contact): JsonResponse
    {
        $this->authorize('view', $contact);

        return response()->json(['suggestions' => $this->ai->suggestActions($contact)]);
    }
}
