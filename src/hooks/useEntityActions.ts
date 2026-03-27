import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Deal, Activity, Note, PaginatedResponse } from '@/types';

// Timeline item (unified shape returned by /timeline endpoints)
export interface TimelineItem {
  id: string;
  type: 'activity' | 'note' | 'deal';
  subtype: string;
  title: string;
  description: string | null;
  user: string | null;
  occurred_at: string;
}

type EntityType = 'contacts' | 'companies' | 'deals';

export function useEntityTimeline(entityType: EntityType, entityId: string) {
  return useQuery<TimelineItem[]>({
    queryKey: ['timeline', entityType, entityId],
    queryFn: async () => {
      const { data } = await api.get(`/${entityType}/${entityId}/timeline`);
      return data.data;
    },
    enabled: !!entityId,
  });
}

export function useEntityActivities(entityType: EntityType, entityId: string) {
  return useQuery<PaginatedResponse<Activity>>({
    queryKey: ['entity-activities', entityType, entityId],
    queryFn: async () => {
      const { data } = await api.get(`/${entityType}/${entityId}/activities`);
      return data;
    },
    enabled: !!entityId,
  });
}

export function useEntityNotes(entityType: EntityType, entityId: string) {
  return useQuery<PaginatedResponse<Note>>({
    queryKey: ['entity-notes', entityType, entityId],
    queryFn: async () => {
      const { data } = await api.get(`/${entityType}/${entityId}/notes`);
      return data;
    },
    enabled: !!entityId,
  });
}

export function useEntityDeals(entityType: 'contacts' | 'companies', entityId: string) {
  return useQuery<PaginatedResponse<Deal>>({
    queryKey: ['entity-deals', entityType, entityId],
    queryFn: async () => {
      const { data } = await api.get(`/${entityType}/${entityId}/deals`);
      return data;
    },
    enabled: !!entityId,
  });
}

// Deal actions
export function useMoveDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ dealId, stageId }: { dealId: string; stageId: string }) => {
      const { data } = await api.post(`/deals/${dealId}/move`, { stage_id: stageId });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}

export function useMarkDealWon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dealId: string) => {
      const { data } = await api.post(`/deals/${dealId}/won`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}

export function useMarkDealLost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ dealId, lostReason }: { dealId: string; lostReason?: string }) => {
      const { data } = await api.post(`/deals/${dealId}/lost`, { lost_reason: lostReason });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}

export function useReorderDeals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deals: Array<{ id: string; stage_id: string; position: number }>) => {
      const { data } = await api.post('/deals/reorder', { deals });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}

// Activity complete
export function useCompleteActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (activityId: string) => {
      const { data } = await api.post(`/activities/${activityId}/complete`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activities'] });
      qc.invalidateQueries({ queryKey: ['entity-activities'] });
    },
  });
}

// Note pin toggle
export function useToggleNotePin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: string) => {
      const { data } = await api.post(`/notes/${noteId}/pin`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes'] });
      qc.invalidateQueries({ queryKey: ['entity-notes'] });
    },
  });
}

// Contact restore
export function useRestoreContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contactId: string) => {
      const { data } = await api.post(`/contacts/${contactId}/restore`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}
