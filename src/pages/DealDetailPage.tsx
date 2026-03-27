import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid2 as Grid,
  Chip,
  Button,
  Paper,
  Tab,
  Tabs,
  IconButton,
  CircularProgress,
  TextField,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Stack,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDeal } from '@/hooks/useDeals';
import { useEntityTimeline } from '@/hooks/useEntityActions';
import { useToastStore } from '@/stores/toastStore';
import ConfirmDialog from '@/components/ConfirmDialog';
import EntityTimeline from '@/components/EntityTimeline';
import CommentsSection from '@/components/CommentsSection';
import api from '@/lib/api';
import type { Activity } from '@/types';

function DetailRow({ label, value, strong = false }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <Box display="grid" gridTemplateColumns="140px 1fr" py={0.75} gap={1.5}>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: '20px' }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          lineHeight: '20px',
          fontWeight: strong ? 700 : 500,
          wordBreak: 'break-word',
        }}
      >
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

function StageRail({
  stages,
  currentStageId,
}: {
  stages: Array<{ id: string; name: string; color: string }>;
  currentStageId?: string;
}) {
  return (
    <Box display="flex" gap={0.75} overflow="auto" pb={0.5}>
      {stages.map((stage, index) => {
        const active = stage.id === currentStageId;
        const bg = active ? (stage.color || '#16a34a') : '#eef2ff';
        const fg = active ? '#ffffff' : '#334155';

        return (
          <Box
            key={stage.id}
            sx={{
              minWidth: 150,
              px: 2,
              py: 1,
              borderRadius: 1,
              color: fg,
              bgcolor: bg,
              fontSize: 12,
              fontWeight: active ? 700 : 500,
              textAlign: 'center',
              position: 'relative',
              clipPath:
                index < stages.length - 1
                  ? 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)'
                  : 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 12px 50%)',
            }}
          >
            {stage.name}
          </Box>
        );
      })}
    </Box>
  );
}

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: deal, isLoading } = useDeal(id!);
  const [tab, setTab] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activityForm, setActivityForm] = useState({ type: 'task', title: '', description: '', scheduled_at: '' });
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const { data: timeline, isLoading: timelineLoading } = useEntityTimeline('deals', id ?? '');

  // Fetch activities for this deal
  const { data: activitiesData } = useQuery<{ data: Activity[] }>({
    queryKey: ['deal-activities', id],
    queryFn: async () => {
      const { data } = await api.get(`/deals/${id}/activities`);
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
      <Box display="flex" alignItems="center" gap={1.5} mb={2}>
        <IconButton onClick={() => navigate('/deals')}>
          <ArrowBackIcon />
        </IconButton>
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

      {deal.pipeline?.stages && deal.pipeline.stages.length > 0 && (
        <Paper sx={{ p: 1, mb: 2, bgcolor: '#f8fafc', border: '1px solid', borderColor: 'divider' }}>
          <StageRail
            stages={deal.pipeline.stages
              .slice()
              .sort((a, b) => a.display_order - b.display_order)
              .map((stage) => ({ id: stage.id, name: stage.name, color: stage.color }))}
            currentStageId={deal.stage?.id}
          />
        </Paper>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Deal"
        message={`Are you sure you want to delete "${deal.title}"? This action cannot be undone.`}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteOpen(false)}
        loading={deleteMutation.isPending}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight={700} mb={1.5}>Deal Details</Typography>
            <DetailRow label="Deal title" value={deal.title} strong />
            <DetailRow label="Budget" value={`${deal.currency} ${Number(deal.value).toLocaleString()}`} strong />
            <DetailRow label="Probability" value={`${deal.probability}%`} />
            <DetailRow
              label="Created"
              value={deal.created_at ? new Date(deal.created_at).toLocaleString() : '—'}
            />
            <DetailRow
              label="Expected close"
              value={deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString() : '—'}
            />

            <Divider sx={{ my: 1.25 }} />

            <DetailRow label="Contact" value={deal.contact?.full_name ?? '—'} />
            <DetailRow label="Company" value={deal.company?.name ?? '—'} />
            <DetailRow label="Pipeline" value={deal.pipeline?.name ?? '—'} />
            <DetailRow label="Stage" value={deal.stage?.name ?? '—'} />
            <DetailRow label="Owner" value={deal.assigned_to?.name ?? '—'} />

            {!!deal.tags?.length && (
              <Box mt={1}>
                <Typography variant="caption" color="text.secondary">Tags</Typography>
                <Stack direction="row" gap={0.5} mt={0.75} flexWrap="wrap">
                  {deal.tags.map((tag) => (
                    <Chip
                      key={tag.id}
                      size="small"
                      label={tag.name}
                      sx={{ bgcolor: `${tag.color}20`, color: tag.color, fontWeight: 700 }}
                    />
                  ))}
                </Stack>
              </Box>
            )}

            {deal.lost_reason && (
              <Box mt={1.5} p={1.2} borderRadius={1} bgcolor="#fef2f2">
                <Typography variant="caption" color="error.main">Lost reason</Typography>
                <Typography variant="body2" color="text.primary">{deal.lost_reason}</Typography>
              </Box>
            )}

            <Box mt={1.5}>
              <Typography variant="caption" color="text.secondary">Custom fields</Typography>
              {deal.custom_fields && Object.keys(deal.custom_fields).length > 0 ? (
                <Box mt={0.5}>
                  {Object.entries(deal.custom_fields).map(([key, value]) => (
                    <DetailRow key={key} label={key} value={formatCustomFieldValue(value)} />
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" mt={0.5}>No custom fields</Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ border: '1px solid', borderColor: 'divider' }}>
            <Box px={2} pt={1.75}>
              <Typography variant="h6" fontWeight={700}>History</Typography>
            </Box>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}>
              <Tab label="Timeline" />
              <Tab label="Activities" />
              <Tab label="Notes" />
            </Tabs>
            <Box p={2}>
              {tab === 0 && (
                <EntityTimeline items={timeline ?? []} loading={timelineLoading} />
              )}

              {tab === 1 && (
                <Box>
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

                  {activitiesData?.data && activitiesData.data.length > 0 ? (
                    <List dense disablePadding>
                      {activitiesData.data.map((activity, i) => (
                        <Box key={activity.id}>
                          {i > 0 && <Divider />}
                          <ListItem
                            secondaryAction={
                              <Chip
                                label={activity.is_completed ? 'Done' : 'Pending'}
                                size="small"
                                color={activity.is_completed ? 'success' : 'warning'}
                              />
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
                                    }}
                                  >
                                    {activity.title}
                                  </Typography>
                                </Box>
                              }
                              secondary={activity.description || 'No details'}
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

              {tab === 2 && (
                <CommentsSection entityType="deal" entityId={id!} />
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
