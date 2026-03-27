import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Company, PaginatedResponse } from '@/types';

interface CompaniesParams {
  page?: number;
  per_page?: number;
  search?: string;
  industry?: string;
  sort?: string;
  direction?: string;
}

export function useCompanies(params: CompaniesParams = {}) {
  return useQuery<PaginatedResponse<Company>>({
    queryKey: ['companies', params],
    queryFn: async () => {
      const { data } = await api.get('/companies', { params });
      return data;
    },
  });
}

export function useCompany(id: string) {
  return useQuery<Company>({
    queryKey: ['companies', id],
    queryFn: async () => {
      const { data } = await api.get(`/companies/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}
