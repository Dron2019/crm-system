import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Contact, PaginatedResponse } from '@/types';

interface ContactsParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  sort?: string;
  direction?: string;
  [key: string]: string | number | undefined;
}

export function useContacts(params: ContactsParams = {}) {
  return useQuery<PaginatedResponse<Contact>>({
    queryKey: ['contacts', params],
    queryFn: async () => {
      const { data } = await api.get('/contacts', { params });
      return data;
    },
  });
}

export function useContact(id: string) {
  return useQuery<Contact>({
    queryKey: ['contacts', id],
    queryFn: async () => {
      const { data } = await api.get(`/contacts/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}
