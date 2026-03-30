import { useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Grid2 as Grid,
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';

const sectionSchema = z.object({
  name: z.string().min(1, 'Section name is required'),
  number: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
});

type SectionFormData = z.infer<typeof sectionSchema>;

interface SectionSummary {
  id: string;
  name: string;
  number?: string | null;
  description?: string | null;
}

interface SectionFormDialogProps {
  open: boolean;
  buildingId: string;
  section?: SectionSummary | null;
  onClose: () => void;
  onSaved?: () => void;
}

const defaultValues: SectionFormData = {
  name: '',
  number: '',
  description: '',
};

export default function SectionFormDialog({
  open,
  buildingId,
  section,
  onClose,
  onSaved,
}: SectionFormDialogProps) {
  const isEditMode = Boolean(section?.id);
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SectionFormData>({
    resolver: zodResolver(sectionSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(section ? {
      name: section.name ?? '',
      number: section.number ?? '',
      description: section.description ?? '',
    } : defaultValues);
  }, [open, reset, section]);

  const mutation = useMutation({
    mutationFn: (payload: SectionFormData) => (
      isEditMode
        ? api.put(`/sections/${section?.id}`, payload)
        : api.post(`/buildings/${buildingId}/sections`, payload)
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chessboard', buildingId] });
      queryClient.invalidateQueries({ queryKey: ['building', buildingId] });
      addToast(isEditMode ? 'Section updated' : 'Section created', 'success');
      onSaved?.();
      onClose();
      reset(defaultValues);
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.message || 'Failed to save section', 'error');
    },
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEditMode ? 'Edit Section' : 'New Section'}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit((values) => mutation.mutateAsync(values))}>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 8 }}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Section Name"
                    fullWidth
                    required
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller
                name="number"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Section Number" fullWidth />
                )}
              />
            </Grid>
            <Grid size={12}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Description" fullWidth multiline minRows={3} />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting || mutation.isPending}>
            {mutation.isPending ? (isEditMode ? 'Saving…' : 'Creating…') : (isEditMode ? 'Save Changes' : 'Create Section')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}