<?php

namespace App\Http\Controllers\Api\V1;

use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(
        private readonly ReportService $reportService,
    ) {}

    public function overview(Request $request): JsonResponse
    {
        $data = $this->reportService->overviewReport(
            $request->user()->current_team_id,
        );

        return response()->json(['data' => $data]);
    }

    public function pipeline(Request $request): JsonResponse
    {
        $data = $this->reportService->pipelineReport(
            $request->user()->current_team_id,
            $request->input('pipeline_id'),
        );

        return response()->json(['data' => $data]);
    }

    public function activities(Request $request): JsonResponse
    {
        $data = $this->reportService->activityReport(
            $request->user()->current_team_id,
            $request->input('date_from'),
            $request->input('date_to'),
        );

        return response()->json(['data' => $data]);
    }

    public function revenue(Request $request): JsonResponse
    {
        $data = $this->reportService->revenueReport(
            $request->user()->current_team_id,
            $request->input('date_from'),
            $request->input('date_to'),
        );

        return response()->json(['data' => $data]);
    }
}
