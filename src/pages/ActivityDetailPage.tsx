import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  IconButton,
  CircularProgress,
  Grid2 as Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import EventIcon from '@mui/icons-material/Event';
import PersonIcon from '@mui/icons-material/Person';
import { useState } from 'react';
import { useActivity } from '@/hooks/useActivities';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/stores/toastStore';
import ConfirmDialog from '@/components/ConfirmDialog';
import CommentsSection from '@/components/CommentsSection';
import api from '@/lib/api';

const typeColors: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error'> = {
  call: 'primary',
  email: 'info',
  meeting: 'warning',
  task: 'secondary',
  note: 'success',
  other: 'error',
};

export default function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { data: activity, isLoading } = useActivity(id!);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', scheduled_at: '' });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/activities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      addToast('Activity deleted');
      navigate('/activities');
    },
    onError: () => addToast('Failed to delete activity', 'error'),
  });

  const toggleMutation = useMutation({
    mutationFn: () =>
      api.put(`/activities/${id}`, {
        completed_at: activity?.is_completed ? null : new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof editForm) => api.put(`/activities/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setEditing(false);
      addToast('Activity updated');
    },
    onError: () => addToast('Failed to update activity', 'error'),
  });

  const openEdit = () => {
    if (!activity) return;
    setEditForm({
      title: activity.title,
      description: activity.description ?? '',
      scheduled_at: activity.scheduled_at ?? '',
    });
    setEditing(true);
  };

  if (isLoading) {
    return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;
  }

  if (!activity) {
    return (
      <Box py={4}>
        <Typography>Activity not found.</Typography>
        <Button onClick={() => navigate('/activities')} sx={{ mt: 2 }}>Back to Activities</Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={() => navigate('/activities')}>
          <ArrowBackIcon />
        </IconButton>
        <Box flex={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton size="small" onClick={() => toggleMutation.mutate()}>
              {activity.is_completed
                ? <CheckCircleIcon color="success" />
                : <RadioButtonUncheckedIcon color="action" />}
            </IconButton>
            <Typography variant="h5" fontWeight={700} sx={{ textDecoration: activity.is_completed ? 'line-through' : 'none' }}>
              {activity.title}
            </Typography>
          </Box>
          <Box display="flex" gap={1} mt={0.5}>
            <Chip
              label={activity.type}
              size="small"
              color={typeColors[activity.type] ?? 'default'}
              variant="outlined"
              sx={{ textTransform: 'capitalize' }}
            />
            <Chip
              label={activity.is_completed ? 'Done' : 'Pending'}
              size="small"
              color={activity.is_completed ? 'success' : 'warning'}
              variant="filled"
              sx={{ fontWeight: 600 }}
            />
          </Box>
        </Box>
        <Button variant="outlined" startIcon={<EditIcon />} onClick={openEdit}>Edit</Button>
        <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteOpen(true)}>Delete</Button>
      </Box>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Activity"
        message={`Are you sure you want to delete "${activity.title}"?`}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteOpen(false)}
        loading={deleteMutation.isPending}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary" mb={1}>
                Description
              </Typography>
              <Typography variant="body1">
                {activity.description || 'No description provided.'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              {activity.scheduled_at && (
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <EventIcon fontSize="small" color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Scheduled</Typography>
                    <Typography variant="body2">{new Date(activity.scheduled_at).toLocaleString()}</Typography>
                  </Box>
                </Box>
              )}

              {activity.completed_at && (
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <CheckCircleIcon fontSize="small" color="success" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Completed</Typography>
                    <Typography variant="body2">{new Date(activity.completed_at).toLocaleString()}</Typography>
                  </Box>
                </Box>
              )}

              {activity.user && (
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <PersonIcon fontSize="small" color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Created By</Typography>
                    <Typography variant="body2">{activity.user.name}</Typography>
                  </Box>
                </Box>
              )}

              <Box mb={2}>
                <Typography variant="caption" color="text.secondary">Created</Typography>
                <Typography variant="body2">{new Date(activity.created_at).toLocaleString()}</Typography>
              </Box>

              {activity.subject_type && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Related To</Typography>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {activity.subject_type.replace('App\\Models\\', '')}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Comments */}
      <Box mt={3}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              Comments
            </Typography>
            <CommentsSection entityType="activity" entityId={id!} />
          </CardContent>
        </Card>
      </Box>

      {/* Edit dialog */}
      <Dialog open={editing} onClose={() => setEditing(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Activity</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Title"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
            <TextField
              label="Scheduled At"
              value={editForm.scheduled_at}
              onChange={(e) => setEditForm({ ...editForm, scheduled_at: e.target.value })}
              fullWidth
              type="datetime-local"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => updateMutation.mutate(editForm)}
            disabled={updateMutation.isPending || !editForm.title}
          >
            {updateMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
