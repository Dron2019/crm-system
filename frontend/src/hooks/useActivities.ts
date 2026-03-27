import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Activity, PaginatedResponse } from '@/types';

interface ActivitiesParams {
  page?: number;
  per_page?: number;
  type?: string;
  is_completed?: boolean;
  sort?: string;
  direction?: string;
}

export function useActivities(params: ActivitiesParams = {}) {
  return useQuery<PaginatedResponse<Activity>>({
    queryKey: ['activities', params],
    queryFn: async () => {
      const { data } = await api.get('/activities', { params });
      return data;
    },
  });
}

export function useActivity(id: string) {
  return useQuery<Activity>({
    queryKey: ['activities', id],
    queryFn: async () => {
      const { data } = await api.get(`/activities/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}
