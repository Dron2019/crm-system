import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface PipelineStageData {
  stage_id: string;
  stage_name: string;
  display_order: number;
  deal_count: number;
  total_value: number;
  avg_value: number;
  avg_probability: number;
}

interface PipelineReport {
  stages: PipelineStageData[];
  totals: {
    open: { count: number; value: number };
    won: { count: number; value: number };
    lost: { count: number; value: number };
    win_rate: number;
  };
}

interface ActivityReport {
  by_type: { type: string; count: number }[];
  by_user: { user_id: string; user_name: string; count: number }[];
  completion: {
    total: number;
    completed: number;
    overdue: number;
    completion_rate: number;
  };
}

interface RevenueReport {
  monthly: { month: string; deal_count: number; revenue: number }[];
  summary: {
    total_revenue: number;
    avg_deal_size: number;
    deal_count: number;
  };
  forecast: {
    weighted_value: number;
    total_pipeline: number;
    open_deals: number;
  };
}

interface OverviewReport {
  contacts: {
    total: number;
    new_this_month: number;
    by_status: { status: string; count: number }[];
  };
  companies: { total: number; new_this_month: number };
  deals: {
    total: number;
    open: number;
    won_this_month: number;
    pipeline_value: number;
  };
  activities: { total_this_month: number; overdue: number };
}

export function useOverviewReport() {
  return useQuery<OverviewReport>({
    queryKey: ['reports', 'overview'],
    queryFn: async () => {
      const { data } = await api.get('/reports/overview');
      return data.data;
    },
  });
}

export function usePipelineReport(pipelineId?: string) {
  return useQuery<PipelineReport>({
    queryKey: ['reports', 'pipeline', pipelineId],
    queryFn: async () => {
      const { data } = await api.get('/reports/pipeline', {
        params: { pipeline_id: pipelineId },
      });
      return data.data;
    },
  });
}

export function useActivityReport(dateFrom?: string, dateTo?: string) {
  return useQuery<ActivityReport>({
    queryKey: ['reports', 'activities', dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await api.get('/reports/activities', {
        params: { date_from: dateFrom, date_to: dateTo },
      });
      return data.data;
    },
  });
}

export function useRevenueReport(dateFrom?: string, dateTo?: string) {
  return useQuery<RevenueReport>({
    queryKey: ['reports', 'revenue', dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await api.get('/reports/revenue', {
        params: { date_from: dateFrom, date_to: dateTo },
      });
      return data.data;
    },
  });
}
