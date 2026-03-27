import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  Switch,
  FormControlLabel,
  Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface Webhook {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  secret: string;
  created_at: string;
  last_triggered_at: string | null;
}

const availableEvents = [
  'contact.created', 'contact.updated', 'contact.deleted',
  'company.created', 'company.updated', 'company.deleted',
  'deal.created', 'deal.updated', 'deal.deleted',
  'deal.won', 'deal.lost', 'deal.moved',
  'activity.created', 'activity.completed',
  'note.created',
];

export default function WebhooksSettingsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>([]);

  const { data: webhooks, isLoading } = useQuery<Webhook[]>({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const { data } = await api.get('/webhooks');
      return data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/webhooks', { url, events }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setDialogOpen(false);
      setUrl('');
      setEvents([]);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.put(`/webhooks/${id}`, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhooks'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/webhooks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhooks'] }),
  });

  if (isLoading) {
    return <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={600}>Webhooks</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Add Webhook
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" mb={2}>
        Webhooks allow external services to receive real-time notifications when events happen in your CRM.
      </Typography>

      {webhooks?.map((webhook) => (
        <Card key={webhook.id} sx={{ mb: 1 }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box display="flex" alignItems="center" gap={2}>
              <Box flex={1}>
                <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                  {webhook.url}
                </Typography>
                <Box display="flex" gap={0.5} mt={0.5} flexWrap="wrap">
                  {webhook.events.map((evt) => (
                    <Chip key={evt} label={evt} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                  ))}
                </Box>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={webhook.is_active}
                    onChange={(e) => toggleMutation.mutate({ id: webhook.id, is_active: e.target.checked })}
                  />
                }
                label={webhook.is_active ? 'Active' : 'Inactive'}
              />
              <IconButton
                size="small"
                onClick={() => navigator.clipboard.writeText(webhook.secret)}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" color="error" onClick={() => deleteMutation.mutate(webhook.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </CardContent>
        </Card>
      ))}

      {(!webhooks || webhooks.length === 0) && (
        <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
          No webhooks configured.
        </Typography>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Webhook</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              fullWidth
              required
              type="url"
              placeholder="https://example.com/webhook"
            />
            <Autocomplete
              multiple
              options={availableEvents}
              value={events}
              onChange={(_, val) => setEvents(val)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip label={option} size="small" {...getTagProps({ index })} key={option} />
                ))
              }
              renderInput={(params) => (
                <TextField {...params} label="Events" placeholder="Select events" />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !url || events.length === 0}
          >
            {createMutation.isPending ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
