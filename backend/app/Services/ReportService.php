<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\Contact;
use App\Models\Company;
use App\Models\Deal;
use Illuminate\Support\Facades\DB;

class ReportService
{
    public function pipelineReport(string $teamId, ?string $pipelineId = null): array
    {
        $query = Deal::query()
            ->where('team_id', $teamId)
            ->where('status', 'open');

        if ($pipelineId) {
            $query->where('pipeline_id', $pipelineId);
        }

        $byStage = $query
            ->join('stages', 'deals.stage_id', '=', 'stages.id')
            ->select(
                'stages.id as stage_id',
                'stages.name as stage_name',
                'stages.display_order',
                DB::raw('COUNT(deals.id) as deal_count'),
                DB::raw('COALESCE(SUM(deals.value), 0) as total_value'),
                DB::raw('COALESCE(AVG(deals.value), 0) as avg_value'),
                DB::raw('COALESCE(AVG(deals.probability), 0) as avg_probability'),
            )
            ->groupBy('stages.id', 'stages.name', 'stages.display_order')
            ->orderBy('stages.display_order')
            ->get();

        $totals = Deal::query()
            ->where('team_id', $teamId)
            ->when($pipelineId, fn ($q) => $q->where('pipeline_id', $pipelineId))
            ->select(
                DB::raw("SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count"),
                DB::raw("SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won_count"),
                DB::raw("SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost_count"),
                DB::raw("COALESCE(SUM(CASE WHEN status = 'open' THEN value ELSE 0 END), 0) as open_value"),
                DB::raw("COALESCE(SUM(CASE WHEN status = 'won' THEN value ELSE 0 END), 0) as won_value"),
                DB::raw("COALESCE(SUM(CASE WHEN status = 'lost' THEN value ELSE 0 END), 0) as lost_value"),
            )
            ->first();

        $winRate = ($totals->won_count + $totals->lost_count) > 0
            ? round($totals->won_count / ($totals->won_count + $totals->lost_count) * 100, 1)
            : 0;

        return [
            'stages' => $byStage,
            'totals' => [
                'open' => ['count' => $totals->open_count, 'value' => $totals->open_value],
                'won' => ['count' => $totals->won_count, 'value' => $totals->won_value],
                'lost' => ['count' => $totals->lost_count, 'value' => $totals->lost_value],
                'win_rate' => $winRate,
            ],
        ];
    }

    public function activityReport(string $teamId, ?string $dateFrom = null, ?string $dateTo = null): array
    {
        $query = Activity::query()->where('team_id', $teamId);

        if ($dateFrom) {
            $query->where('created_at', '>=', $dateFrom);
        }
        if ($dateTo) {
            $query->where('created_at', '<=', $dateTo);
        }

        $byType = $query->clone()
            ->select('type', DB::raw('COUNT(*) as count'))
            ->groupBy('type')
            ->get();

        $byUser = $query->clone()
            ->join('users', 'activities.user_id', '=', 'users.id')
            ->select('users.id as user_id', 'users.name as user_name', DB::raw('COUNT(*) as count'))
            ->groupBy('users.id', 'users.name')
            ->orderByDesc('count')
            ->get();

        $completionStats = $query->clone()
            ->select(
                DB::raw('COUNT(*) as total'),
                DB::raw('COUNT(completed_at) as completed'),
                DB::raw('SUM(CASE WHEN completed_at IS NULL AND scheduled_at < NOW() THEN 1 ELSE 0 END) as overdue'),
            )
            ->first();

        return [
            'by_type' => $byType,
            'by_user' => $byUser,
            'completion' => [
                'total' => $completionStats->total,
                'completed' => $completionStats->completed,
                'overdue' => $completionStats->overdue,
                'completion_rate' => $completionStats->total > 0
                    ? round($completionStats->completed / $completionStats->total * 100, 1)
                    : 0,
            ],
        ];
    }

    public function revenueReport(string $teamId, ?string $dateFrom = null, ?string $dateTo = null): array
    {
        $wonDeals = Deal::query()
            ->where('team_id', $teamId)
            ->where('status', 'won');

        if ($dateFrom) {
            $wonDeals->where('updated_at', '>=', $dateFrom);
        }
        if ($dateTo) {
            $wonDeals->where('updated_at', '<=', $dateTo);
        }

        $monthly = $wonDeals->clone()
            ->select(
                DB::raw("DATE_FORMAT(updated_at, '%Y-%m') as month"),
                DB::raw('COUNT(*) as deal_count'),
                DB::raw('COALESCE(SUM(value), 0) as revenue'),
            )
            ->groupBy(DB::raw("DATE_FORMAT(updated_at, '%Y-%m')"))
            ->orderBy('month')
            ->get();

        $totalRevenue = $wonDeals->clone()->sum('value') ?? 0;
        $avgDealSize = $wonDeals->clone()->avg('value') ?? 0;

        // Forecast: weighted pipeline value
        $forecast = Deal::query()
            ->where('team_id', $teamId)
            ->where('status', 'open')
            ->select(
                DB::raw("COALESCE(SUM(value * probability / 100), 0) as weighted_value"),
                DB::raw("COALESCE(SUM(value), 0) as total_pipeline"),
                DB::raw('COUNT(*) as open_deals'),
            )
            ->first();

        return [
            'monthly' => $monthly,
            'summary' => [
                'total_revenue' => round($totalRevenue, 2),
                'avg_deal_size' => round($avgDealSize, 2),
                'deal_count' => $wonDeals->clone()->count(),
            ],
            'forecast' => [
                'weighted_value' => round($forecast->weighted_value, 2),
                'total_pipeline' => round($forecast->total_pipeline, 2),
                'open_deals' => $forecast->open_deals,
            ],
        ];
    }

    public function overviewReport(string $teamId): array
    {
        return [
            'contacts' => [
                'total' => Contact::where('team_id', $teamId)->count(),
                'new_this_month' => Contact::where('team_id', $teamId)
                    ->where('created_at', '>=', now()->startOfMonth())->count(),
                'by_status' => Contact::where('team_id', $teamId)
                    ->select('status', DB::raw('COUNT(*) as count'))
                    ->groupBy('status')->get(),
            ],
            'companies' => [
                'total' => Company::where('team_id', $teamId)->count(),
                'new_this_month' => Company::where('team_id', $teamId)
                    ->where('created_at', '>=', now()->startOfMonth())->count(),
            ],
            'deals' => [
                'total' => Deal::where('team_id', $teamId)->count(),
                'open' => Deal::where('team_id', $teamId)->where('status', 'open')->count(),
                'won_this_month' => Deal::where('team_id', $teamId)
                    ->where('status', 'won')
                    ->where('updated_at', '>=', now()->startOfMonth())->count(),
                'pipeline_value' => Deal::where('team_id', $teamId)
                    ->where('status', 'open')->sum('value') ?? 0,
            ],
            'activities' => [
                'total_this_month' => Activity::where('team_id', $teamId)
                    ->where('created_at', '>=', now()->startOfMonth())->count(),
                'overdue' => Activity::where('team_id', $teamId)
                    ->whereNull('completed_at')
                    ->where('scheduled_at', '<', now())->count(),
            ],
        ];
    }
}
