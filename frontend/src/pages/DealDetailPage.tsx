import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid2 as Grid,
  Chip,
  Avatar,
  Button,
  Paper,
  Tab,
  Tabs,
  IconButton,
  CircularProgress,
  LinearProgress,
  TextField,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import PushPinIcon from '@mui/icons-material/PushPin';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDeal } from '@/hooks/useDeals';
import { useToastStore } from '@/stores/toastStore';
import ConfirmDialog from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { Activity, Note } from '@/types';

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box display="flex" justifyContent="space-between" alignItems="flex-start" py={0.5} gap={2}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" textAlign="right" sx={{ wordBreak: 'break-word' }}>
        {value ?? '—'}
      </Typography>
    </Box>
  );
}

function formatCustomFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

const activityTypes = ['call', 'email', 'meeting', 'task', 'note'];
const typeColors: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error'> = {
  call: 'primary', email: 'info', meeting: 'warning', task: 'secondary', note: 'success',
};

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: deal, isLoading } = useDeal(id!);
  const [tab, setTab] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activityForm, setActivityForm] = useState({ type: 'task', title: '', description: '', scheduled_at: '' });
  const [noteBody, setNoteBody] = useState('');
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  // Fetch activities for this deal
  const { data: activitiesData } = useQuery<{ data: Activity[] }>({
    queryKey: ['deal-activities', id],
    queryFn: async () => {
      const { data } = await api.get(`/deals/${id}/activities`);
      return data;
    },
    enabled: !!id,
  });

  // Fetch notes for this deal
  const { data: notesData } = useQuery<{ data: Note[] }>({
    queryKey: ['deal-notes', id],
    queryFn: async () => {
      const { data } = await api.get(`/deals/${id}/notes`);
      return data;
    },
    enabled: !!id,
  });

  // Create activity for this deal
  const createActivityMutation = useMutation({
    mutationFn: (formData: typeof activityForm) =>
      api.post('/activities', {
        ...formData,
        subject_type: 'deal',
        subject_id: id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-activities', id] });
      setActivityForm({ type: 'task', title: '', description: '', scheduled_at: '' });
      addToast('Activity added');
    },
    onError: () => addToast('Failed to add activity', 'error'),
  });

  // Create note for this deal
  const createNoteMutation = useMutation({
    mutationFn: (body: string) =>
      api.post('/notes', {
        notable_type: 'deal',
        notable_id: id,
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-notes', id] });
      setNoteBody('');
      addToast('Note added');
    },
    onError: () => addToast('Failed to add note', 'error'),
  });

  // Toggle activity completion
  const toggleActivityMutation = useMutation({
    mutationFn: (activity: Activity) =>
      api.put(`/activities/${activity.id}`, {
        completed_at: activity.is_completed ? null : new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-activities', id] });
    },
  });

  // Toggle note pin
  const togglePinMutation = useMutation({
    mutationFn: (noteId: string) => api.post(`/notes/${noteId}/pin`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-notes', id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/deals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      addToast('Deal deleted');
      navigate('/deals');
    },
    onError: () => addToast('Failed to delete deal', 'error'),
  });

  if (isLoading) {
    return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;
  }

  if (!deal) {
    return (
      <Box py={4}>
        <Typography>Deal not found.</Typography>
        <Button onClick={() => navigate('/deals')} sx={{ mt: 2 }}>Back to Deals</Button>
      </Box>
    );
  }

  const statusColor: Record<string, 'default' | 'success' | 'error' | 'info'> = {
    open: 'info',
    won: 'success',
    lost: 'error',
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={() => navigate('/deals')}>
          <ArrowBackIcon />
        </IconButton>
        <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}>
          <MonetizationOnIcon />
        </Avatar>
        <Box flex={1}>
          <Typography variant="h5" fontWeight={700}>{deal.title}</Typography>
          <Box display="flex" gap={1} alignItems="center" mt={0.5}>
            <Chip
              label={deal.status}
              size="small"
              color={statusColor[deal.status] ?? 'default'}
              variant="outlined"
            />
            {deal.stage && (
              <Chip
                label={deal.stage.name}
                size="small"
                sx={{
                  bgcolor: `${deal.stage.color || '#6366f1'}20`,
                  color: deal.stage.color || '#6366f1',
                  fontWeight: 600,
                }}
              />
            )}
          </Box>
        </Box>
        <Button variant="contained" startIcon={<EditIcon />} onClick={() => navigate(`/deals/${id}/edit`)}>
          Edit
        </Button>
        <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteOpen(true)}>
          Delete
        </Button>
      </Box>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Deal"
        message={`Are you sure you want to delete "${deal.title}"? This action cannot be undone.`}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteOpen(false)}
        loading={deleteMutation.isPending}
      />

      <Grid container spacing={3}>
        {/* Sidebar */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h4" fontWeight={800} color="primary" mb={1}>
                {deal.currency} {Number(deal.value).toLocaleString()}
              </Typography>

              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" color="text.secondary">Probability</Typography>
                  <Typography variant="caption" fontWeight={600}>{deal.probability}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={deal.probability} sx={{ height: 6, borderRadius: 3 }} />
              </Box>

              <Divider sx={{ my: 1 }} />

              <DetailRow label="Deal ID" value={deal.id} />
              <DetailRow label="Title" value={deal.title} />
              <DetailRow label="Status" value={deal.status} />
              <DetailRow label="Value" value={`${deal.currency} ${Number(deal.value).toLocaleString()}`} />
              <DetailRow label="Currency" value={deal.currency} />
              <DetailRow label="Probability" value={`${deal.probability}%`} />
              <DetailRow
                label="Expected Close Date"
                value={deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString() : '—'}
              />
              <DetailRow label="Pipeline" value={deal.pipeline?.name ?? '—'} />
              <DetailRow label="Stage" value={deal.stage?.name ?? '—'} />
              <DetailRow label="Contact" value={deal.contact?.full_name ?? '—'} />
              <DetailRow label="Company" value={deal.company?.name ?? '—'} />
              <DetailRow label="Assigned To" value={deal.assigned_to?.name ?? '—'} />
              <DetailRow
                label="Created At"
                value={deal.created_at ? new Date(deal.created_at).toLocaleString() : '—'}
              />
              <DetailRow
                label="Updated At"
                value={deal.updated_at ? new Date(deal.updated_at).toLocaleString() : '—'}
              />

              {deal.lost_reason && (
                <Box mt={1.5} p={1.25} borderRadius={1} bgcolor="error.50">
                  <Typography variant="caption" color="error">Lost Reason</Typography>
                  <Typography variant="body2">{deal.lost_reason}</Typography>
                </Box>
              )}

              <Box mt={1.5}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Tags</Typography>
                {deal.tags && deal.tags.length > 0 ? (
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {deal.tags.map((tag) => (
                      <Chip key={tag.id} label={tag.name} size="small" sx={{ bgcolor: `${tag.color}20`, color: tag.color, fontWeight: 600 }} />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2">—</Typography>
                )}
              </Box>

              <Box mt={1.5}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Custom Fields</Typography>
                {deal.custom_fields && Object.keys(deal.custom_fields).length > 0 ? (
                  <Box>
                    {Object.entries(deal.custom_fields).map(([key, value]) => (
                      <DetailRow key={key} label={key} value={formatCustomFieldValue(value)} />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2">—</Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Main content */}
        <Grid size={{ xs: 12, md: 8 }}>
          {/* Pipeline progress */}
          {deal.pipeline?.stages && deal.stage && (
            <Paper sx={{ mb: 2, p: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={1.5}>Pipeline Progress</Typography>
              <Box display="flex" gap={0.5}>
                {deal.pipeline.stages
                  .slice()
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((stage) => {
                    const isCurrent = stage.id === deal.stage!.id;
                    const isPast = stage.display_order < deal.stage!.display_order;
                    return (
                      <Box
                        key={stage.id}
                        flex={1}
                        py={0.75}
                        px={1}
                        textAlign="center"
                        borderRadius={1}
                        sx={{
                          bgcolor: isCurrent
                            ? `${stage.color || '#6366f1'}30`
                            : isPast
                            ? `${stage.color || '#6366f1'}15`
                            : 'action.hover',
                          border: isCurrent ? `2px solid ${stage.color || '#6366f1'}` : '2px solid transparent',
                        }}
                      >
                        <Typography
                          variant="caption"
                          fontWeight={isCurrent ? 700 : 500}
                          color={isCurrent ? stage.color || '#6366f1' : 'text.secondary'}
                          noWrap
                        >
                          {stage.name}
                        </Typography>
                      </Box>
                    );
                  })}
              </Box>
            </Paper>
          )}

          <Paper>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
              <Tab label="Activities" />
              <Tab label="Notes" />
            </Tabs>
            <Box p={2}>
              {tab === 0 && (
                <Box>
                  {/* Add activity form */}
                  <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                    <TextField
                      select
                      size="small"
                      value={activityForm.type}
                      onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
                      sx={{ minWidth: 120 }}
                      label="Type"
                    >
                      {activityTypes.map((t) => (
                        <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t}</MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      size="small"
                      value={activityForm.title}
                      onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                      placeholder="Activity title"
                      sx={{ flex: 1, minWidth: 200 }}
                    />
                    <TextField
                      size="small"
                      type="datetime-local"
                      value={activityForm.scheduled_at}
                      onChange={(e) => setActivityForm({ ...activityForm, scheduled_at: e.target.value })}
                      slotProps={{ inputLabel: { shrink: true } }}
                      label="Scheduled"
                      sx={{ minWidth: 180 }}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AddIcon />}
                      disabled={!activityForm.title || createActivityMutation.isPending}
                      onClick={() => createActivityMutation.mutate(activityForm)}
                    >
                      Add
                    </Button>
                  </Box>

                  {/* Activity list */}
                  {activitiesData?.data && activitiesData.data.length > 0 ? (
                    <List dense disablePadding>
                      {activitiesData.data.map((activity, i) => (
                        <Box key={activity.id}>
                          {i > 0 && <Divider />}
                          <ListItem
                            secondaryAction={
                              <Box display="flex" gap={0.5} alignItems="center">
                                {activity.scheduled_at && (
                                  <Typography variant="caption" color="text.secondary">
                                    {new Date(activity.scheduled_at).toLocaleDateString()}
                                  </Typography>
                                )}
                                <Chip
                                  label={activity.is_completed ? 'Done' : 'Pending'}
                                  size="small"
                                  color={activity.is_completed ? 'success' : 'warning'}
                                  variant="filled"
                                  sx={{ fontWeight: 600, fontSize: 10 }}
                                />
                              </Box>
                            }
                          >
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <IconButton size="small" onClick={() => toggleActivityMutation.mutate(activity)}>
                                {activity.is_completed
                                  ? <CheckCircleIcon color="success" fontSize="small" />
                                  : <RadioButtonUncheckedIcon color="action" fontSize="small" />}
                              </IconButton>
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Chip
                                    label={activity.type}
                                    size="small"
                                    color={typeColors[activity.type] ?? 'default'}
                                    variant="outlined"
                                    sx={{ textTransform: 'capitalize', fontSize: 10, height: 20 }}
                                  />
                                  <Typography
                                    variant="body2"
                                    fontWeight={600}
                                    sx={{
                                      textDecoration: activity.is_completed ? 'line-through' : 'none',
                                      cursor: 'pointer',
                                      '&:hover': { color: 'primary.main' },
                                    }}
                                    onClick={() => navigate(`/activities/${activity.id}`)}
                                  >
                                    {activity.title}
                                  </Typography>
                                </Box>
                              }
                              secondary={activity.description}
                            />
                          </ListItem>
                        </Box>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary" py={1}>
                      No activities yet.
                    </Typography>
                  )}
                </Box>
              )}

              {tab === 1 && (
                <Box>
                  {/* Add note form */}
                  <Box display="flex" gap={1} mb={2}>
                    <TextField
                      size="small"
                      value={noteBody}
                      onChange={(e) => setNoteBody(e.target.value)}
                      placeholder="Write a note..."
                      multiline
                      minRows={2}
                      sx={{ flex: 1 }}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AddIcon />}
                      disabled={!noteBody.trim() || createNoteMutation.isPending}
                      onClick={() => createNoteMutation.mutate(noteBody)}
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      Add
                    </Button>
                  </Box>

                  {/* Notes list */}
                  {notesData?.data && notesData.data.length > 0 ? (
                    <List dense disablePadding>
                      {notesData.data.map((note, i) => (
                        <Box key={note.id}>
                          {i > 0 && <Divider />}
                          <ListItem
                            secondaryAction={
                              <IconButton size="small" onClick={() => togglePinMutation.mutate(note.id)}>
                                <PushPinIcon fontSize="small" color={note.is_pinned ? 'primary' : 'action'} />
                              </IconButton>
                            }
                          >
                            <ListItemText
                              primary={
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                  {note.body}
                                </Typography>
                              }
                              secondary={
                                <Box display="flex" gap={1} mt={0.5}>
                                  <Typography variant="caption" color="text.secondary">
                                    {note.user?.name ?? 'Unknown'} · {new Date(note.created_at).toLocaleDateString()}
                                  </Typography>
                                  {note.is_pinned && (
                                    <Chip label="Pinned" size="small" color="primary" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                                  )}
                                </Box>
                              }
                            />
                          </ListItem>
                        </Box>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary" py={1}>
                      No notes yet.
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
