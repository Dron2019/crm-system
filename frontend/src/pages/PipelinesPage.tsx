import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Paper,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { usePipelines } from '@/hooks/useDeals';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Pipeline } from '@/types';

export default function PipelinesPage() {
  const queryClient = useQueryClient();
  const { data: pipelines, isLoading } = usePipelines();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [pipelineName, setPipelineName] = useState('');

  const saveMutation = useMutation({
    mutationFn: (data: { name: string }) =>
      editingPipeline
        ? api.put(`/pipelines/${editingPipeline.id}`, data)
        : api.post('/pipelines', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/pipelines/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });

  const openCreate = () => {
    setEditingPipeline(null);
    setPipelineName('');
    setDialogOpen(true);
  };

  const openEdit = (pipeline: Pipeline) => {
    setEditingPipeline(pipeline);
    setPipelineName(pipeline.name);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingPipeline(null);
    setPipelineName('');
  };

  const handleSave = () => {
    if (!pipelineName.trim()) return;
    saveMutation.mutate({ name: pipelineName.trim() });
  };

  if (isLoading) {
    return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>Pipelines</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          New Pipeline
        </Button>
      </Box>

      <Box display="flex" flexDirection="column" gap={2}>
        {pipelines?.map((pipeline) => {
          const stages = pipeline.stages?.slice().sort((a, b) => a.display_order - b.display_order) ?? [];
          return (
            <Card key={pipeline.id}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="h6" fontWeight={700}>{pipeline.name}</Typography>
                    {pipeline.is_default && <Chip label="Default" size="small" color="primary" variant="outlined" />}
                  </Box>
                  <Box>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEdit(pipeline)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {!pipeline.is_default && (
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => deleteMutation.mutate(pipeline.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>

                {stages.length > 0 ? (
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {stages.map((stage) => (
                      <Paper
                        key={stage.id}
                        variant="outlined"
                        sx={{
                          px: 2,
                          py: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          borderLeft: `3px solid ${stage.color || '#6366f1'}`,
                        }}
                      >
                        <Typography variant="body2" fontWeight={600}>{stage.name}</Typography>
                        {stage.is_won && <Chip label="Won" size="small" color="success" sx={{ height: 18, fontSize: 10 }} />}
                        {stage.is_lost && <Chip label="Lost" size="small" color="error" sx={{ height: 18, fontSize: 10 }} />}
                      </Paper>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No stages configured.
                  </Typography>
                )}
              </CardContent>
            </Card>
          );
        })}

        {(!pipelines || pipelines.length === 0) && (
          <Paper sx={{ py: 6, textAlign: 'center' }}>
            <Typography color="text.secondary" mb={2}>No pipelines yet.</Typography>
            <Button variant="contained" onClick={openCreate}>Create your first pipeline</Button>
          </Paper>
        )}
      </Box>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="xs" fullWidth>
        <DialogTitle>{editingPipeline ? 'Edit Pipeline' : 'New Pipeline'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Pipeline Name"
            fullWidth
            value={pipelineName}
            onChange={(e) => setPipelineName(e.target.value)}
            sx={{ mt: 1 }}
            error={saveMutation.isError}
            helperText={saveMutation.isError ? 'Failed to save. Try again.' : ''}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!pipelineName.trim() || saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
