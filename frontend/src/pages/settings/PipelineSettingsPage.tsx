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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Pipeline } from '@/types';

interface StageForm {
  id?: string;
  name: string;
  color: string;
  is_won: boolean;
  is_lost: boolean;
}

export default function PipelineSettingsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [stages, setStages] = useState<StageForm[]>([]);

  const { data: pipelines, isLoading } = useQuery<Pipeline[]>({
    queryKey: ['pipelines'],
    queryFn: async () => {
      const { data } = await api.get('/pipelines');
      return data.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const stagesPayload = stages.map((s, i) => ({
        ...(s.id ? { id: s.id } : {}),
        name: s.name,
        display_order: i,
        color: s.color,
        is_won: s.is_won,
        is_lost: s.is_lost,
      }));
      return editId
        ? api.put(`/pipelines/${editId}`, { name, stages: stagesPayload })
        : api.post('/pipelines', { name, stages: stagesPayload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/pipelines/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipelines'] }),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditId(null);
    setName('');
    setStages([]);
  };

  const openEdit = (pipeline: Pipeline) => {
    setEditId(pipeline.id);
    setName(pipeline.name);
    setStages(
      (pipeline.stages ?? [])
        .slice()
        .sort((a, b) => a.display_order - b.display_order)
        .map((s) => ({
          id: s.id,
          name: s.name,
          color: s.color || '#6366f1',
          is_won: s.is_won,
          is_lost: s.is_lost,
        })),
    );
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditId(null);
    setName('');
    setStages([
      { name: 'Lead', color: '#6366f1', is_won: false, is_lost: false },
      { name: 'Qualified', color: '#8b5cf6', is_won: false, is_lost: false },
      { name: 'Proposal', color: '#a855f7', is_won: false, is_lost: false },
      { name: 'Won', color: '#22c55e', is_won: true, is_lost: false },
      { name: 'Lost', color: '#ef4444', is_won: false, is_lost: true },
    ]);
    setDialogOpen(true);
  };

  const addStage = () => {
    setStages([...stages, { name: '', color: '#6366f1', is_won: false, is_lost: false }]);
  };

  const removeStage = (index: number) => {
    setStages(stages.filter((_, i) => i !== index));
  };

  const updateStage = (index: number, field: keyof StageForm, value: string | boolean) => {
    setStages(stages.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const moveStage = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= stages.length) return;
    const updated = [...stages];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setStages(updated);
  };

  if (isLoading) {
    return <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={600}>Pipelines</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          New Pipeline
        </Button>
      </Box>

      {pipelines?.map((pipeline) => (
        <Card key={pipeline.id} sx={{ mb: 1 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box flex={1}>
              <Typography variant="body1" fontWeight={600}>
                {pipeline.name}
                {pipeline.is_default && (
                  <Chip label="Default" size="small" color="primary" variant="outlined" sx={{ ml: 1 }} />
                )}
              </Typography>
              <Box display="flex" gap={0.5} mt={0.5} flexWrap="wrap">
                {(pipeline.stages ?? [])
                  .slice()
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((stage) => (
                    <Chip
                      key={stage.id}
                      label={stage.name}
                      size="small"
                      sx={{ borderLeft: `3px solid ${stage.color || '#6366f1'}` }}
                      variant="outlined"
                    />
                  ))}
              </Box>
            </Box>
            <IconButton size="small" onClick={() => openEdit(pipeline)}>
              <EditIcon fontSize="small" />
            </IconButton>
            {!pipeline.is_default && (
              <IconButton size="small" color="error" onClick={() => deleteMutation.mutate(pipeline.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </CardContent>
        </Card>
      ))}

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Edit Pipeline' : 'Create Pipeline'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Pipeline Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            sx={{ mt: 1, mb: 2 }}
          />
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle2" fontWeight={600}>Stages</Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={addStage}>Add Stage</Button>
          </Box>
          {stages.map((stage, index) => (
            <Box key={index} display="flex" gap={1} alignItems="center" mb={1}>
              <Box display="flex" flexDirection="column">
                <IconButton size="small" onClick={() => moveStage(index, -1)} disabled={index === 0}>
                  <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <IconButton size="small" onClick={() => moveStage(index, 1)} disabled={index === stages.length - 1}>
                  <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
              <input
                type="color"
                value={stage.color}
                onChange={(e) => updateStage(index, 'color', e.target.value)}
                style={{ width: 32, height: 32, border: 'none', cursor: 'pointer', padding: 0 }}
              />
              <TextField
                size="small"
                value={stage.name}
                onChange={(e) => updateStage(index, 'name', e.target.value)}
                placeholder="Stage name"
                sx={{ flex: 1 }}
              />
              <Chip
                label="Won"
                size="small"
                color={stage.is_won ? 'success' : 'default'}
                variant={stage.is_won ? 'filled' : 'outlined'}
                onClick={() => updateStage(index, 'is_won', !stage.is_won)}
                sx={{ cursor: 'pointer' }}
              />
              <Chip
                label="Lost"
                size="small"
                color={stage.is_lost ? 'error' : 'default'}
                variant={stage.is_lost ? 'filled' : 'outlined'}
                onClick={() => updateStage(index, 'is_lost', !stage.is_lost)}
                sx={{ cursor: 'pointer' }}
              />
              <IconButton size="small" color="error" onClick={() => removeStage(index)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !name || stages.some(s => !s.name)}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
