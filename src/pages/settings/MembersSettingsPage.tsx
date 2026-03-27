import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useTeamRoles } from '@/hooks/useTeamMembers';

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  custom_role_id: string | null;
  email_verified_at: string | null;
  is_active: boolean;
  deactivation_reason: string | null;
}

interface MembersResponse {
  data: Member[];
  meta?: {
    can_manage_members?: boolean;
    current_user_role?: string;
  };
}

const roles = ['admin', 'member', 'viewer'];

export default function MembersSettingsPage() {
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [deactivateDialog, setDeactivateDialog] = useState<{ open: boolean; userId?: string; name?: string }>({ open: false });
  const [deactivateReason, setDeactivateReason] = useState('');

  const { data: rolesData } = useTeamRoles();
  const customRoles = rolesData?.data ?? [];

  const { data: membersResponse, isLoading } = useQuery<MembersResponse>({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data } = await api.get('/team/members');
      return data;
    },
  });

  const members = membersResponse?.data ?? [];
  const canManageMembers = !!membersResponse?.meta?.can_manage_members;
  const currentUserRole = membersResponse?.meta?.current_user_role;

  const inviteMutation = useMutation({
    mutationFn: () => api.post('/team/invitations', { email: inviteEmail, role: inviteRole }),
    onSuccess: () => {
      setInviteOpen(false);
      setInviteEmail('');
      setInviteRole('member');
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role, customRoleId }: { userId: string; role: string; customRoleId?: string | null }) =>
      api.put(`/team/members/${userId}/role`, { role, custom_role_id: customRoleId ?? null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-members'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/team/members/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-members'] }),
  });

  const verifyMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/team/members/${userId}/verify`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-members'] }),
  });

  const deactivateMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      api.post(`/team/members/${userId}/deactivate`, { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-members'] }),
  });

  const activateMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/team/members/${userId}/activate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-members'] }),
  });

  if (isLoading) {
    return <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>;
  }

  return (
    <Box>
      {!canManageMembers && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You are signed in as {currentUserRole ?? 'member'}. Only owner/admin can invite users or change roles.
        </Alert>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={600}>Team Members</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setInviteOpen(true)}
          disabled={!canManageMembers}
        >
          Invite
        </Button>
      </Box>

      {members.map((member) => (
        <Card
          key={member.id}
          sx={{ mb: 1, opacity: member.is_active ? 1 : 0.6, border: member.is_active ? undefined : '1px solid #fca5a5' }}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: member.is_active ? 'primary.main' : 'grey.400', fontSize: 14 }}>
              {member.name.charAt(0)}
            </Avatar>
            <Box flex={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="body2" fontWeight={600}>{member.name}</Typography>
                {!member.is_active && <Chip label="Inactive" size="small" color="error" variant="outlined" />}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {member.email} · {member.email_verified_at ? 'verified' : 'unverified'}
              </Typography>
            </Box>
            <TextField
              select
              size="small"
              value={member.role === 'custom' && member.custom_role_id ? member.custom_role_id : member.role}
              onChange={(e) => {
                const val = e.target.value;
                const isCustom = customRoles.some((r) => r.id === val);
                updateRoleMutation.mutate(
                  isCustom ? { userId: member.id, role: 'custom', customRoleId: val } : { userId: member.id, role: val },
                );
              }}
              sx={{ minWidth: 130 }}
              disabled={member.role === 'owner' || !canManageMembers}
            >
              <MenuItem value="owner" disabled>Owner</MenuItem>
              {roles.map((r) => (
                <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize' }}>{r}</MenuItem>
              ))}
              {customRoles.length > 0 && <MenuItem disabled sx={{ fontSize: 11 }}>── Custom ──</MenuItem>}
              {customRoles.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: r.color }} />
                    {r.name}
                  </Box>
                </MenuItem>
              ))}
            </TextField>
            {canManageMembers && !member.email_verified_at && member.is_active && (
              <Tooltip title="Verify email">
                <IconButton size="small" color="success" onClick={() => verifyMutation.mutate(member.id)}>
                  <CheckCircleOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {canManageMembers && member.role !== 'owner' && (
              member.is_active ? (
                <Tooltip title="Deactivate">
                  <IconButton size="small" color="warning" onClick={() => { setDeactivateReason(''); setDeactivateDialog({ open: true, userId: member.id, name: member.name }); }}>
                    <BlockIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip title="Reactivate">
                  <IconButton size="small" color="success" onClick={() => activateMutation.mutate(member.id)}>
                    <CheckCircleIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )
            )}
            {member.role !== 'owner' && canManageMembers && (
              <IconButton size="small" color="error" onClick={() => removeMutation.mutate(member.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </CardContent>
        </Card>
      ))}

      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite Team Member</DialogTitle>
        <DialogContent>
          {inviteMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>Failed to send invitation.</Alert>}
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              fullWidth
              type="email"
              required
            />
            <TextField
              select
              label="Role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              fullWidth
            >
              {roles.map((r) => (
                <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize' }}>{r}</MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => inviteMutation.mutate()}
            disabled={inviteMutation.isPending || !inviteEmail}
          >
            {inviteMutation.isPending ? 'Sending…' : 'Send Invite'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deactivate Dialog */}
      <Dialog open={deactivateDialog.open} onClose={() => setDeactivateDialog({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>Deactivate {deactivateDialog.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            This user will be blocked from logging in. You can reactivate them at any time.
          </Typography>
          <TextField
            label="Reason (optional)"
            multiline
            rows={2}
            fullWidth
            value={deactivateReason}
            onChange={(e) => setDeactivateReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeactivateDialog({ open: false })}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            disabled={deactivateMutation.isPending}
            onClick={() => {
              if (!deactivateDialog.userId) return;
              deactivateMutation.mutate(
                { userId: deactivateDialog.userId, reason: deactivateReason || undefined },
                { onSuccess: () => setDeactivateDialog({ open: false }) },
              );
            }}
          >
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
