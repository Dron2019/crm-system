import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { AuditLog, PaginatedResponse } from '@/types';

interface AuditLogFilters {
  auditable_type?: string;
  auditable_id?: string;
  action?: string;
  user_id?: string;
  page?: number;
  per_page?: number;
}

export function useAuditLogs(filters: AuditLogFilters = {}) {
  return useQuery<PaginatedResponse<AuditLog>>({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      const { data } = await api.get('/audit-logs', { params: filters });
      return data;
    },
  });
}
