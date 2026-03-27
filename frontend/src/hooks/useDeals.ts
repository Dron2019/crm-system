import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Deal, Pipeline, PaginatedResponse } from '@/types';

interface DealsParams {
  page?: number;
  per_page?: number;
  search?: string;
  pipeline_id?: string;
  stage_id?: string;
  status?: string;
  assigned_to?: string;
  sort?: string;
  direction?: string;
}

export function useDeals(params: DealsParams = {}) {
  return useQuery<PaginatedResponse<Deal>>({
    queryKey: ['deals', params],
    queryFn: async () => {
      const { data } = await api.get('/deals', { params });
      return data;
    },
  });
}

export function useDeal(id: string) {
  return useQuery<Deal>({
    queryKey: ['deals', id],
    queryFn: async () => {
      const { data } = await api.get(`/deals/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function usePipelines() {
  return useQuery<Pipeline[]>({
    queryKey: ['pipelines'],
    queryFn: async () => {
      const { data } = await api.get('/pipelines');
      return data.data;
    },
  });
}

export function usePipeline(id: string) {
  return useQuery<Pipeline>({
    queryKey: ['pipelines', id],
    queryFn: async () => {
      const { data } = await api.get(`/pipelines/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}
