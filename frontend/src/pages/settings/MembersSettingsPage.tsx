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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface MembersResponse {
  data: Member[];
  meta?: {
    can_manage_members?: boolean;
    current_user_role?: string;
  };
}

const roles = ['admin', 'member', 'viewer'];
const roleHelp: Record<string, string> = {
  owner: 'Full access, billing owner, cannot be changed.',
  admin: 'Can manage members, settings, imports, and all CRM records.',
  member: 'Can work with CRM records but cannot manage members/import settings.',
  viewer: 'Read-only access for CRM records.',
};

export default function MembersSettingsPage() {
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');

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
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.put(`/team/members/${userId}/role`, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-members'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/team/members/${userId}`),
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
        <Card key={member.id} sx={{ mb: 1 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 14 }}>
              {member.name.charAt(0)}
            </Avatar>
            <Box flex={1}>
              <Typography variant="body2" fontWeight={600}>{member.name}</Typography>
              <Typography variant="caption" color="text.secondary">{member.email}</Typography>
            </Box>
            <TextField
              select
              size="small"
              value={member.role}
              onChange={(e) => updateRoleMutation.mutate({ userId: member.id, role: e.target.value })}
              sx={{ minWidth: 120 }}
              disabled={member.role === 'owner' || !canManageMembers}
              helperText={roleHelp[member.role] ?? ''}
            >
              <MenuItem value="owner" disabled>Owner</MenuItem>
              {roles.map((r) => (
                <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize' }}>{r}</MenuItem>
              ))}
            </TextField>
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
    </Box>
  );
}
