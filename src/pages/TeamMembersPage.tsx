import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Avatar,
  LinearProgress,
  Tooltip,
  alpha,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  useTeamMembers,
  useTeamInvitations,
  useTeamRoles,
  useInviteMember,
  useUpdateMemberRole,
  useRemoveMember,
  useCancelInvitation,
  useVerifyMember,
  useDeactivateMember,
  useActivateMember,
} from '@/hooks/useTeamMembers';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import ConfirmDialog from '@/components/ConfirmDialog';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useSearchParams } from 'react-router-dom';

const roleColors: Record<string, 'error' | 'primary' | 'default' | 'secondary'> = {
  owner: 'error',
  admin: 'primary',
  member: 'default',
  viewer: 'secondary',
};

export default function TeamMembersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const addToast = useToastStore((s) => s.addToast);
  const currentTeamRole = user?.teams?.find((t) => t.id === user?.current_team_id)?.role;
  const canManageByRole = currentTeamRole === 'owner' || currentTeamRole === 'admin';
  const { data: membersData, isLoading: membersLoading } = useTeamMembers();
  const members = membersData?.data ?? [];
  const canManageMembers = membersData?.meta?.can_manage_members ?? canManageByRole;
  const { data: invitations, isLoading: invitationsLoading } = useTeamInvitations(canManageMembers);
  const inviteMember = useInviteMember();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const cancelInvitation = useCancelInvitation();
  const verifyMember = useVerifyMember();
  const deactivateMember = useDeactivateMember();
  const activateMember = useActivateMember();
  const { data: rolesData } = useTeamRoles();
  const customRoles = rolesData?.data ?? [];

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [memberSearch, setMemberSearch] = useState(searchParams.get('search') ?? '');
  const [memberRoleFilter, setMemberRoleFilter] = useState(searchParams.get('role') ?? '');
  const [memberSortBy, setMemberSortBy] = useState<'name' | 'email' | 'role' | 'last_login_at'>(
    (searchParams.get('sort') as 'name' | 'email' | 'role' | 'last_login_at') ?? 'name',
  );
  const [memberSortDirection, setMemberSortDirection] = useState<'asc' | 'desc'>(
    (searchParams.get('direction') as 'asc' | 'desc') ?? 'asc',
  );
  const [customKey, setCustomKey] = useState(searchParams.get('custom_key') ?? '');
  const [customValue, setCustomValue] = useState(searchParams.get('custom_value') ?? '');
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; userId?: string; name?: string }>({
    open: false,
  });
  const [deactivateDialog, setDeactivateDialog] = useState<{ open: boolean; userId?: string; name?: string }>({ open: false });
  const [deactivateReason, setDeactivateReason] = useState('');

  const visibleMembers = useMemo(() => {
    const filtered = (members ?? []).filter((member) => {
      const q = memberSearch.trim().toLowerCase();
      const matchesSearch = !q
        || member.name.toLowerCase().includes(q)
        || member.email.toLowerCase().includes(q);
      const matchesRole = !memberRoleFilter || member.role === memberRoleFilter;
      const matchesCustom = !customKey || !customValue
        ? true
        : String((member as unknown as Record<string, unknown>)[customKey] ?? '').toLowerCase().includes(customValue.toLowerCase());
      return matchesSearch && matchesRole && matchesCustom;
    });

    return filtered.sort((a, b) => {
      let aVal = '';
      let bVal = '';
      if (memberSortBy === 'last_login_at') {
        aVal = a.last_login_at ?? '';
        bVal = b.last_login_at ?? '';
      } else {
        aVal = String(a[memberSortBy] ?? '').toLowerCase();
        bVal = String(b[memberSortBy] ?? '').toLowerCase();
      }

      if (aVal < bVal) return memberSortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return memberSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [members, memberSearch, memberRoleFilter, customKey, customValue, memberSortBy, memberSortDirection]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (memberSearch) next.set('search', memberSearch);
    if (memberRoleFilter) next.set('role', memberRoleFilter);
    if (memberSortBy) next.set('sort', memberSortBy);
    if (memberSortDirection) next.set('direction', memberSortDirection);
    if (customKey) next.set('custom_key', customKey);
    if (customValue) next.set('custom_value', customValue);
    setSearchParams(next, { replace: true });
  }, [memberSearch, memberRoleFilter, memberSortBy, memberSortDirection, customKey, customValue, setSearchParams]);

  const resetFilters = () => {
    setMemberSearch('');
    setMemberRoleFilter('');
    setMemberSortBy('name');
    setMemberSortDirection('asc');
    setCustomKey('');
    setCustomValue('');
  };

  const handleInvite = () => {
    inviteMember.mutate(
      { email: inviteEmail, role: inviteRole },
      {
        onSuccess: () => {
          addToast('Invitation sent', 'success');
          setInviteOpen(false);
          setInviteEmail('');
          setInviteRole('member');
        },
        onError: () => addToast('Failed to send invitation', 'error'),
      },
    );
  };

  const handleRoleChange = (userId: string, role: string) => {
    const isCustom = customRoles.some((r) => r.id === role);
    updateRole.mutate(
      isCustom ? { userId, role: 'custom', customRoleId: role } : { userId, role },
      {
        onSuccess: () => addToast('Role updated', 'success'),
        onError: () => addToast('Failed to update role', 'error'),
      },
    );
  };

  const handleRemove = () => {
    if (!confirmDelete.userId) return;
    removeMember.mutate(confirmDelete.userId, {
      onSuccess: () => {
        addToast('Member removed', 'success');
        setConfirmDelete({ open: false });
      },
      onError: () => addToast('Failed to remove member', 'error'),
    });
  };

  if (membersLoading) return <LinearProgress />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Team Members
        </Typography>
        {canManageMembers && (
          <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setInviteOpen(true)}>
            Invite Member
          </Button>
        )}
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Members ({visibleMembers.length})
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
            <TextField
              size="small"
              label="Search"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              sx={{ minWidth: 220 }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Role</InputLabel>
              <Select
                label="Role"
                value={memberRoleFilter}
                onChange={(e) => setMemberRoleFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="owner">Owner</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="member">Member</MenuItem>
                <MenuItem value="viewer">Viewer</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Sort</InputLabel>
              <Select
                label="Sort"
                value={memberSortBy}
                onChange={(e) => setMemberSortBy(e.target.value as 'name' | 'email' | 'role' | 'last_login_at')}
              >
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="email">Email</MenuItem>
                <MenuItem value="role">Role</MenuItem>
                <MenuItem value="last_login_at">Last Login</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Direction</InputLabel>
              <Select
                label="Direction"
                value={memberSortDirection}
                onChange={(e) => setMemberSortDirection(e.target.value as 'asc' | 'desc')}
              >
                <MenuItem value="asc">Asc</MenuItem>
                <MenuItem value="desc">Desc</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Custom Key"
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value)}
              sx={{ minWidth: 150 }}
            />
            <TextField
              size="small"
              label="Custom Value"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              sx={{ minWidth: 150 }}
            />
            <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={resetFilters}>
              Reset
            </Button>
          </Box>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Member</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Verified</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleMembers.map((member) => (
                  <TableRow
                    key={member.id}
                    sx={{
                      opacity: member.is_active ? 1 : 0.55,
                      bgcolor: member.is_active ? undefined : (theme) => alpha(theme.palette.error.light, 0.06),
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {member.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2">{member.name}</Typography>
                          {!member.is_active && (
                            <Typography variant="caption" color="error.main">
                              Inactive{member.deactivated_at ? ` · ${new Date(member.deactivated_at).toLocaleDateString()}` : ''}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      {member.email_verified_at ? (
                        <Chip label="Verified" size="small" color="success" />
                      ) : (
                        <Chip label="Unverified" size="small" color="warning" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      {member.role === 'owner' ? (
                        <Chip label="Owner" color="error" size="small" />
                      ) : !canManageMembers ? (
                        <Chip
                          label={member.role === 'custom' && member.custom_role_id
                            ? (customRoles.find((r) => r.id === member.custom_role_id)?.name ?? 'Custom')
                            : member.role}
                          size="small"
                          color={roleColors[member.role] ?? 'default'}
                        />
                      ) : (
                        <FormControl size="small" sx={{ minWidth: 130 }}>
                          <Select
                            value={member.role === 'custom' && member.custom_role_id ? member.custom_role_id : member.role}
                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                            size="small"
                          >
                            <MenuItem value="admin">Admin</MenuItem>
                            <MenuItem value="member">Member</MenuItem>
                            <MenuItem value="viewer">Viewer</MenuItem>
                            {customRoles.length > 0 && <MenuItem disabled sx={{ fontSize: 11, opacity: 0.6 }}>── Custom roles ──</MenuItem>}
                            {customRoles.map((r) => (
                              <MenuItem key={r.id} value={r.id}>
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: r.color }} />
                                  {r.name}
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.last_login_at
                        ? new Date(member.last_login_at).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        {canManageMembers && !member.email_verified_at && member.is_active && (
                          <Tooltip title="Verify user">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() =>
                                verifyMember.mutate(member.id, {
                                  onSuccess: () => addToast('User verified', 'success'),
                                  onError: () => addToast('Failed to verify user', 'error'),
                                })
                              }
                            >
                              <CheckCircleOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canManageMembers && member.role !== 'owner' && member.id !== user?.id && (
                          member.is_active ? (
                            <Tooltip title="Deactivate user">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => {
                                  setDeactivateReason('');
                                  setDeactivateDialog({ open: true, userId: member.id, name: member.name });
                                }}
                              >
                                <BlockIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Tooltip title="Reactivate user">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() =>
                                  activateMember.mutate(member.id, {
                                    onSuccess: () => addToast('User reactivated', 'success'),
                                    onError: () => addToast('Failed to reactivate user', 'error'),
                                  })
                                }
                              >
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )
                        )}
                        {canManageMembers && member.role !== 'owner' && member.id !== user?.id && (
                          <Tooltip title="Remove member">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                setConfirmDelete({
                                  open: true,
                                  userId: member.id,
                                  name: member.name,
                                })
                              }
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {visibleMembers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                      No team members found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {canManageMembers && !invitationsLoading && invitations && invitations.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Pending Invitations ({invitations.length})
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Invited By</TableCell>
                    <TableCell>Expires</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invitations.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>{inv.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={inv.role}
                          size="small"
                          color={roleColors[inv.role] ?? 'default'}
                        />
                      </TableCell>
                      <TableCell>{inv.inviter?.name ?? '—'}</TableCell>
                      <TableCell>{new Date(inv.expires_at).toLocaleDateString()}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          color="error"
                          onClick={() =>
                            cancelInvitation.mutate(inv.id, {
                              onSuccess: () => addToast('Invitation cancelled', 'success'),
                            })
                          }
                        >
                          Cancel
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite Team Member</DialogTitle>
        <DialogContent>
          <TextField
            label="Email Address"
            type="email"
            fullWidth
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} label="Role">
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="member">Member</MenuItem>
              <MenuItem value="viewer">Viewer</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleInvite}
            disabled={!inviteEmail || inviteMember.isPending}
          >
            Send Invitation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Confirmation */}
      <ConfirmDialog
        open={confirmDelete.open}
        title="Remove Team Member"
        message={`Are you sure you want to remove ${confirmDelete.name} from the team?`}
        onConfirm={handleRemove}
        onCancel={() => setConfirmDelete({ open: false })}
      />

      {/* Deactivate Dialog */}
      <Dialog open={deactivateDialog.open} onClose={() => setDeactivateDialog({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>Deactivate {deactivateDialog.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            The user will be blocked from logging in immediately. You can reactivate them at any time.
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
            disabled={deactivateMember.isPending}
            onClick={() => {
              if (!deactivateDialog.userId) return;
              deactivateMember.mutate(
                { userId: deactivateDialog.userId, reason: deactivateReason || undefined },
                {
                  onSuccess: () => {
                    addToast('User deactivated', 'success');
                    setDeactivateDialog({ open: false });
                  },
                  onError: () => addToast('Failed to deactivate user', 'error'),
                },
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
