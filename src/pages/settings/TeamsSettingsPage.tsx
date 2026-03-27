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
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GroupIcon from '@mui/icons-material/Group';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

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
  const [expanded, setExpanded] = useState<string | false>(false);

  const { data: teamsResponse, isLoading, isError } = useQuery<TeamsResponse>({
    queryKey: ['admin-teams'],
    queryFn: async () => {
      const { data } = await api.get('/admin/teams');
      return data;
    },
  });

  const teams = teamsResponse?.data ?? [];

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
        <Typography variant="h6" fontWeight={700}>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </AccordionDetails>
          </Accordion>
        ))
      )}
    </Box>
  );
}
