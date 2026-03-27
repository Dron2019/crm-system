import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface WorkflowAction {
  id?: string;
  type: 'send_email' | 'update_field' | 'create_activity' | 'send_notification' | 'webhook';
  config: Record<string, unknown>;
  order?: number;
}

export interface WorkflowLog {
  id: string;
  status: string;
  ran_at: string;
  error?: string | null;
}

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_conditions: Record<string, unknown> | null;
  is_active: boolean;
  actions: WorkflowAction[];
  logs?: WorkflowLog[];
  logs_count?: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowFormData {
  name: string;
  description?: string;
  trigger_type: string;
  trigger_conditions?: Record<string, unknown> | null;
  is_active: boolean;
  actions: WorkflowAction[];
}

export function useWorkflows() {
  return useQuery<Workflow[]>({
    queryKey: ['workflows'],
    queryFn: async () => {
      const { data } = await api.get('/workflows');
      return data.data;
    },
  });
}

export function useWorkflow(id: string) {
  return useQuery<Workflow>({
    queryKey: ['workflows', id],
    queryFn: async () => {
      const { data } = await api.get(`/workflows/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: WorkflowFormData) => {
      const { data } = await api.post('/workflows', payload);
      return data.data as Workflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

export function useUpdateWorkflow(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<WorkflowFormData>) => {
      const { data } = await api.put(`/workflows/${id}`, payload);
      return data.data as Workflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['workflows', id] });
    },
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workflows/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

export function useToggleWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data } = await api.put(`/workflows/${id}`, { is_active });
      return data.data as Workflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}
