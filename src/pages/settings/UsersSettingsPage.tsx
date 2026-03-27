import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
} from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';

interface SystemUser {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  is_system_admin: boolean;
  deactivated_at: string | null;
  deactivation_reason: string | null;
  created_at: string;
}

interface UsersResponse {
  data: SystemUser[];
}

export default function UsersSettingsPage() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [deactivateDialog, setDeactivateDialog] = useState<{ open: boolean; userId?: string; name?: string }>({ open: false });
  const [deactivateReason, setDeactivateReason] = useState('');
  const [resetPasswordDialog, setResetPasswordDialog] = useState<{ open: boolean; userId?: string; name?: string }>({ open: false });
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const { data: usersResponse, isLoading } = useQuery<UsersResponse>({
    queryKey: ['system-users'],
    queryFn: async () => {
      const { data } = await api.get('/users');
      return data;
    },
  });

  const users = usersResponse?.data ?? [];

  const deactivateMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      api.post(`/users/${userId}/deactivate`, { reason }),
    onSuccess: () => {
      setDeactivateDialog({ open: false });
      setDeactivateReason('');
      addToast('User deactivated successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
    },
    onError: () => addToast('Failed to deactivate user', 'error'),
  });

  const activateMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/users/${userId}/activate`, {}),
    onSuccess: () => {
      addToast('User activated successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
    },
    onError: () => addToast('Failed to activate user', 'error'),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/users/${userId}/reset-password`, {}),
    onSuccess: (response: any) => {
      setGeneratedPassword(response.data.temporary_password);
      addToast('Password reset successfully', 'success');
    },
    onError: () => addToast('Failed to reset password', 'error'),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, isSystemAdmin }: { userId: string; isSystemAdmin: boolean }) =>
      api.put(`/users/${userId}/role`, { is_system_admin: isSystemAdmin }),
    onSuccess: () => {
      addToast('User role updated successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
    },
    onError: () => addToast('Failed to update user role', 'error'),
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={3}>
        System Users
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="center">Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow
                key={user.id}
                sx={{
                  opacity: user.is_active ? 1 : 0.55,
                  bgcolor: user.is_active ? 'inherit' : 'warning.lighter',
                  '&:hover': { bgcolor: user.is_active ? 'action.hover' : 'warning.lighter' },
                }}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {user.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{user.email}</Typography>
                </TableCell>
                <TableCell align="center">
                  {user.is_active ? (
                    <Chip label="Active" color="success" size="small" />
                  ) : (
                    <Tooltip title={user.deactivation_reason || 'Deactivated'}>
                      <Chip label="Inactive" color="warning" size="small" />
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell align="center">
                  <Typography variant="caption">
                    {new Date(user.created_at).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Reset Password">
                    <IconButton
                      size="small"
                      onClick={() => {
                        resetPasswordMutation.mutate(user.id);
                        setResetPasswordDialog({ open: true, userId: user.id, name: user.name });
                      }}
                      color="primary"
                    >
                      <RefreshIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>

                  {user.is_active ? (
                    <Tooltip title="Deactivate">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeactivateDialog({ open: true, userId: user.id, name: user.name })}
                      >
                        <BlockIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Activate">
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => activateMutation.mutate(user.id)}
                      >
                        <CheckCircleIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  )}

                  {/* Role toggle */}
                  <Tooltip title={user.is_system_admin ? "System Admin" : "Regular User"}>
                    <IconButton
                      size="small"
                      color={user.is_system_admin ? "warning" : "default"}
                      onClick={() => updateRoleMutation.mutate({ 
                        userId: user.id, 
        isSystemAdmin: !user.is_system_admin 
                      })}
                      disabled={updateRoleMutation.isPending}
                    >
                      <AdminPanelSettingsIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Deactivate Dialog */}
      <Dialog open={deactivateDialog.open} onClose={() => setDeactivateDialog({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>Deactivate User</DialogTitle>
        <DialogContent>
          <Typography mb={2}>Are you sure you want to deactivate {deactivateDialog.name}?</Typography>
          <TextField
            fullWidth
            label="Reason (optional)"
            placeholder="e.g., Employee left company"
            value={deactivateReason}
            onChange={(e) => setDeactivateReason(e.target.value)}
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeactivateDialog({ open: false })}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => deactivateMutation.mutate({ userId: deactivateDialog.userId!, reason: deactivateReason })}
            disabled={deactivateMutation.isPending}
          >
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialog.open} onClose={() => setResetPasswordDialog({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>Password Reset</DialogTitle>
        <DialogContent>
          {generatedPassword ? (
            <Box>
              <Typography mb={2}>Password has been reset for {resetPasswordDialog.name}.</Typography>
              <Typography variant="body2" sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1, fontFamily: 'monospace' }}>
                {generatedPassword}
              </Typography>
              <Typography variant="caption" display="block" mt={1}>
                Share this temporary password with the user. They will need to change it on first login.
              </Typography>
            </Box>
          ) : resetPasswordMutation.isPending ? (
            <CircularProgress />
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetPasswordDialog({ open: false })}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
