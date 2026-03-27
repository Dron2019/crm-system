import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Note, PaginatedResponse } from '@/types';

interface NotesParams {
  page?: number;
  per_page?: number;
  notable_type?: string;
  notable_id?: string;
  sort?: string;
  direction?: string;
}

export function useNotes(params: NotesParams = {}) {
  return useQuery<PaginatedResponse<Note>>({
    queryKey: ['notes', params],
    queryFn: async () => {
      const { data } = await api.get('/notes', { params });
      return data;
    },
  });
}

export function useNote(id: string) {
  return useQuery<Note>({
    queryKey: ['notes', id],
    queryFn: async () => {
      const { data } = await api.get(`/notes/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}
