import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Tag } from '@/types';

export function useTags() {
  return useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data } = await api.get('/tags');
      return data.data;
    },
  });
}
