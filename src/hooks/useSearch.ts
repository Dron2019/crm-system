import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Contact, Company, Deal } from '@/types';

interface SearchResults {
  contacts: Contact[];
  companies: Company[];
  deals: Deal[];
}

export function useGlobalSearch(query: string) {
  return useQuery<SearchResults>({
    queryKey: ['search', query],
    queryFn: async () => {
      const { data } = await api.get('/search', {
        params: { q: query, limit: 5 },
      });
      return data.data;
    },
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
}
