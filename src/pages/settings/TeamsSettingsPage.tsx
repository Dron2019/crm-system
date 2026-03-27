import { useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GroupIcon from '@mui/icons-material/Group';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  role: string;
}

interface AdminTeam {
  id: string;
  name: string;
  slug: string;
  owner: { id: string; name: string; email: string } | null;
  members_count: number;
  members: TeamMember[];
  created_at: string;
}

interface TeamsResponse {
  data: AdminTeam[];
}

interface MoveDialog {
  open: boolean;
  userId?: string;
  userName?: string;
  fromTeamId?: string;
  fromTeamName?: string;
}

function roleColor(role: string): 'error' | 'warning' | 'default' {
  if (role === 'owner') return 'error';
  if (role === 'admin') return 'warning';
  return 'default';
}

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function TeamsSettingsPage() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [expanded, setExpanded] = useState<string | false>(false);
  const [moveDialog, setMoveDialog] = useState<MoveDialog>({ open: false });
  const [toTeamId, setToTeamId] = useState('');
  const [moveRole, setMoveRole] = useState<'member' | 'admin'>('member');

  const { data: teamsResponse, isLoading, isError } = useQuery<TeamsResponse>({
    queryKey: ['admin-teams'],
    queryFn: async () => {
      const { data } = await api.get('/admin/teams');
      return data;
    },
  });

  const teams = teamsResponse?.data ?? [];

  const moveMutation = useMutation({
    mutationFn: ({ userId, fromTeamId, toTeamId, role }: {
      userId: string;
      fromTeamId?: string;
      toTeamId: string;
      role: string;
    }) =>
      api.post(`/admin/users/${userId}/move`, {
        from_team_id: fromTeamId,
        to_team_id: toTeamId,
        role,
      }),
    onSuccess: () => {
      addToast('Member moved successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      setMoveDialog({ open: false });
      setToTeamId('');
      setMoveRole('member');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to move member';
      addToast(msg, 'error');
    },
  });

  function openMoveDialog(member: TeamMember, team: AdminTeam) {
    setToTeamId('');
    setMoveRole('member');
    setMoveDialog({
      open: true,
      userId: member.id,
      userName: member.name,
      fromTeamId: team.id,
      fromTeamName: team.name,
    });
  }

  const targetTeams = teams.filter((t) => t.id !== moveDialog.fromTeamId);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return <Alert severity="error">Failed to load teams.</Alert>;
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <Typography variant="h6" fontWeight={500}>
          All Teams
        </Typography>
        <Chip label={teams.length} size="small" color="primary" />
      </Box>

      {teams.length === 0 ? (
        <Alert severity="info">No teams found.</Alert>
      ) : (
        teams.map((team) => (
          <Accordion
            key={team.id}
            expanded={expanded === team.id}
            onChange={(_, isExpanded) => setExpanded(isExpanded ? team.id : false)}
            disableGutters
            sx={{ mb: 1, '&:before': { display: 'none' }, border: 1, borderColor: 'divider', borderRadius: '8px !important' }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2 }}>
              <Box display="flex" alignItems="center" gap={2} flex={1} mr={2}>
                <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 14 }}>
                  {initials(team.name)}
                </Avatar>
                <Box flex={1} minWidth={0}>
                  <Typography variant="body1" fontWeight={600} noWrap>
                    {team.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {team.slug}
                    {team.owner && ` · Owner: ${team.owner.name}`}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1} flexShrink={0}>
                  <GroupIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {team.members_count}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    {new Date(team.created_at).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>
            </AccordionSummary>

            <AccordionDetails sx={{ p: 0 }}>
              {team.members.length === 0 ? (
                <Box p={2}>
                  <Typography variant="body2" color="text.secondary">No members in this team.</Typography>
                </Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell>Member</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell align="center">Role</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {team.members.map((member) => (
                      <TableRow key={member.id} sx={{ opacity: member.is_active ? 1 : 0.5 }}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Avatar sx={{ width: 28, height: 28, fontSize: 11 }}>
                              {initials(member.name)}
                            </Avatar>
                            <Typography variant="body2" fontWeight={500}>
                              {member.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{member.email}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={member.role}
                            size="small"
                            color={roleColor(member.role)}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          {member.is_active ? (
                            <Chip label="Active" size="small" color="success" />
                          ) : (
                            <Tooltip title="Deactivated">
                              <Chip label="Inactive" size="small" color="warning" />
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title={member.role === 'owner' ? 'Cannot move team owner' : 'Move to another team'}>
                            <span>
                              <IconButton
                                size="small"
                                disabled={member.role === 'owner' || teams.length < 2}
                                onClick={() => openMoveDialog(member, team)}
                              >
                                <DriveFileMoveIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </AccordionDetails>
          </Accordion>
        ))
      )}

      {/* Move Member Dialog */}
      <Dialog
        open={moveDialog.open}
        onClose={() => setMoveDialog({ open: false })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Move Member to Another Team</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <Typography variant="body2">
            Moving <strong>{moveDialog.userName}</strong> from{' '}
            <strong>{moveDialog.fromTeamName}</strong>.
          </Typography>

          <FormControl fullWidth size="small">
            <InputLabel>Destination Team</InputLabel>
            <Select
              value={toTeamId}
              label="Destination Team"
              onChange={(e) => setToTeamId(e.target.value)}
            >
              {targetTeams.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Role in new team</InputLabel>
            <Select
              value={moveRole}
              label="Role in new team"
              onChange={(e) => setMoveRole(e.target.value as 'member' | 'admin')}
            >
              <MenuItem value="member">Member</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMoveDialog({ open: false })}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!toTeamId || moveMutation.isPending}
            onClick={() =>
              moveMutation.mutate({
                userId: moveDialog.userId!,
                fromTeamId: moveDialog.fromTeamId,
                toTeamId,
                role: moveRole,
              })
            }
          >
            Move
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
