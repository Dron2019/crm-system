import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  custom_role_id: string | null;
  email_verified_at: string | null;
  is_active: boolean;
  deactivated_at: string | null;
  deactivation_reason: string | null;
  last_login_at: string | null;
}

interface TeamMembersResponse {
  data: TeamMember[];
  meta?: {
    can_manage_members?: boolean;
    current_user_role?: string | null;
  };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  created_at: string;
  inviter?: { id: string; name: string };
}

export interface TeamRole {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  permissions: string[];
  is_builtin?: boolean;
  created_at?: string;
}

export interface TeamRolesResponse {
  data: TeamRole[];
  builtin: TeamRole[];
}

export function useTeamMembers() {
  const user = useAuthStore((s) => s.user);

  return useQuery<TeamMembersResponse>({
    queryKey: ['team-members', user?.current_team_id],
    queryFn: async () => {
      const { data } = await api.get('/team/members');
      return data;
    },
    enabled: !!user?.current_team_id,
  });
}

export function useTeamInvitations(enabled = true) {
  const user = useAuthStore((s) => s.user);

  return useQuery<Invitation[]>({
    queryKey: ['team-invitations', user?.current_team_id],
    queryFn: async () => {
      const { data } = await api.get('/team/invitations');
      return data.data;
    },
    enabled: !!user?.current_team_id && enabled,
  });
}

export function useTeamRoles() {
  const user = useAuthStore((s) => s.user);

  return useQuery<TeamRolesResponse>({
    queryKey: ['team-roles', user?.current_team_id],
    queryFn: async () => {
      const { data } = await api.get('/team/roles');
      return data;
    },
    enabled: !!user?.current_team_id,
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { email: string; role?: string }) => {
      const { data } = await api.post('/team/invitations', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invitations'] });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role, customRoleId }: { userId: string; role: string; customRoleId?: string | null }) => {
      const { data } = await api.put(`/team/members/${userId}/role`, {
        role,
        custom_role_id: customRoleId ?? null,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/team/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
  });
}

export function useVerifyMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.post(`/team/members/${userId}/verify`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
  });
}

export function useDeactivateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      const { data } = await api.post(`/team/members/${userId}/deactivate`, { reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
  });
}

export function useActivateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.post(`/team/members/${userId}/activate`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      await api.delete(`/team/invitations/${invitationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invitations'] });
    },
  });
}

export function useCreateTeamRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { name: string; description?: string; color?: string; permissions: string[] }) => {
      const { data } = await api.post('/team/roles', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-roles'] });
    },
  });
}

export function useUpdateTeamRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; name?: string; description?: string; color?: string; permissions?: string[] }) => {
      const { data } = await api.put(`/team/roles/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-roles'] });
    },
  });
}

export function useDeleteTeamRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/team/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-roles'] });
    },
  });
}
