<?php

namespace App\Services;

use App\Models\Contact;
use App\Models\Deal;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class AiService
{
    /**
     * Score a lead based on engagement signals and profile completeness.
     */
    public function scoreContact(Contact $contact): array
    {
        $score = 0;
        $factors = [];

        // Profile completeness (0-25)
        $profileFields = ['email', 'phone', 'job_title', 'source'];
        $filled = collect($profileFields)->filter(fn ($f) => !empty($contact->$f))->count();
        $profileScore = (int) (($filled / count($profileFields)) * 25);
        $score += $profileScore;
        $factors[] = ['factor' => 'profile_completeness', 'score' => $profileScore, 'detail' => "{$filled}/" . count($profileFields) . " fields"];

        // Activity engagement (0-25)
        $activityCount = $contact->activities()->count();
        $activityScore = min(25, $activityCount * 5);
        $score += $activityScore;
        $factors[] = ['factor' => 'activity_engagement', 'score' => $activityScore, 'detail' => "{$activityCount} activities"];

        // Deal association (0-25)
        $dealCount = $contact->deals()->count();
        $dealScore = min(25, $dealCount * 10);
        $score += $dealScore;
        $factors[] = ['factor' => 'deal_association', 'score' => $dealScore, 'detail' => "{$dealCount} deals"];

        // Recency (0-25)
        $lastContact = $contact->last_contacted_at;
        if ($lastContact) {
            $daysSince = $lastContact->diffInDays(now());
            $recencyScore = max(0, 25 - (int) ($daysSince / 3));
            $factors[] = ['factor' => 'recency', 'score' => $recencyScore, 'detail' => "{$daysSince} days since last contact"];
        } else {
            $recencyScore = 0;
            $factors[] = ['factor' => 'recency', 'score' => 0, 'detail' => 'Never contacted'];
        }
        $score += $recencyScore;

        return [
            'score' => min(100, $score),
            'grade' => $this->scoreToGrade($score),
            'factors' => $factors,
        ];
    }

    /**
     * Generate a draft email for a contact.
     */
    public function draftEmail(Contact $contact, string $purpose = 'follow_up'): array
    {
        $templates = [
            'follow_up' => [
                'subject' => "Following up — {$contact->full_name}",
                'body' => "Hi {$contact->first_name},\n\nI wanted to follow up on our recent conversation. "
                    . "I'd love to schedule a call to discuss how we can help you further.\n\n"
                    . "Would you be available for a quick chat this week?\n\nBest regards",
            ],
            'introduction' => [
                'subject' => "Nice to meet you, {$contact->first_name}",
                'body' => "Hi {$contact->first_name},\n\nThank you for your interest. "
                    . "I'd love to learn more about your needs and explore how we might be able to help.\n\n"
                    . "Could we schedule a brief introductory call?\n\nBest regards",
            ],
            'deal_proposal' => [
                'subject' => "Proposal for {$contact->full_name}",
                'body' => "Hi {$contact->first_name},\n\nThank you for taking the time to discuss your requirements. "
                    . "I've put together a proposal based on our conversation.\n\n"
                    . "Please find the details below and let me know if you have any questions.\n\nBest regards",
            ],
            'check_in' => [
                'subject' => "Checking in — {$contact->full_name}",
                'body' => "Hi {$contact->first_name},\n\nI hope everything is going well. "
                    . "I wanted to check in and see if there's anything we can help with.\n\n"
                    . "Feel free to reach out anytime.\n\nBest regards",
            ],
        ];

        $template = $templates[$purpose] ?? $templates['follow_up'];

        return [
            'subject' => $template['subject'],
            'body' => $template['body'],
            'purpose' => $purpose,
        ];
    }

    /**
     * Summarize a deal's activity for quick review.
     */
    public function summarizeDeal(Deal $deal): array
    {
        $deal->loadCount(['activities' => fn ($q) => $q->where('subject_type', Deal::class)]);

        $activities = $deal->activities()
            ->latest()
            ->limit(10)
            ->get(['type', 'title', 'created_at', 'is_completed']);

        $totalValue = $deal->value;
        $daysInPipeline = $deal->created_at->diffInDays(now());
        $stage = $deal->stage;

        $summary = [
            'deal' => $deal->title,
            'value' => $deal->currency . ' ' . number_format((float) $totalValue, 2),
            'stage' => $stage?->name ?? 'Unknown',
            'probability' => $deal->probability . '%',
            'days_in_pipeline' => $daysInPipeline,
            'activity_count' => $activities->count(),
            'recent_activities' => $activities->map(fn ($a) => [
                'type' => $a->type,
                'title' => $a->title,
                'date' => $a->created_at->toDateString(),
                'completed' => $a->is_completed,
            ])->toArray(),
            'health' => $this->assessDealHealth($deal, $daysInPipeline, $activities->count()),
        ];

        return $summary;
    }

    /**
     * Suggest next best actions for a contact.
     */
    public function suggestActions(Contact $contact): array
    {
        $suggestions = [];

        // Check if missing phone or email
        if (empty($contact->email)) {
            $suggestions[] = [
                'action' => 'complete_profile',
                'label' => 'Add email address',
                'priority' => 'high',
            ];
        }

        // Check last contact date
        if (!$contact->last_contacted_at || $contact->last_contacted_at->diffInDays(now()) > 30) {
            $suggestions[] = [
                'action' => 'follow_up',
                'label' => 'Schedule a follow-up call',
                'priority' => 'high',
            ];
        }

        // Check for open deals
        $openDeals = $contact->deals()->where('status', 'open')->count();
        if ($openDeals > 0) {
            $suggestions[] = [
                'action' => 'review_deals',
                'label' => "Review {$openDeals} open deal(s)",
                'priority' => 'medium',
            ];
        }

        // Check for missing notes
        $noteCount = $contact->notes()->count();
        if ($noteCount === 0) {
            $suggestions[] = [
                'action' => 'add_notes',
                'label' => 'Add notes from last interaction',
                'priority' => 'low',
            ];
        }

        return $suggestions;
    }

    protected function scoreToGrade(int $score): string
    {
        return match (true) {
            $score >= 80 => 'A',
            $score >= 60 => 'B',
            $score >= 40 => 'C',
            $score >= 20 => 'D',
            default => 'F',
        };
    }

    protected function assessDealHealth(Deal $deal, int $daysInPipeline, int $activityCount): string
    {
        if ($activityCount === 0 && $daysInPipeline > 14) return 'at_risk';
        if ($daysInPipeline > 90) return 'stale';
        if ($activityCount > 5 && $deal->probability >= 50) return 'healthy';
        if ($activityCount > 0) return 'active';

        return 'new';
    }
}
