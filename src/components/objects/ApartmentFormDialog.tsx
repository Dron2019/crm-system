import { useEffect } from 'react';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  TextField,
  Grid2 as Grid,
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';

const apartmentSchema = z.object({
  section_id: z.string().optional().or(z.literal('')),
  number: z.string().min(1, 'Apartment number is required'),
  floor: z.coerce.number().min(0, 'Floor is required'),
  rooms: z.coerce.number().min(1, 'Rooms is required'),
  area: z.coerce.number().min(1, 'Area is required'),
  price: z.coerce.number().min(0, 'Price is required'),
  status_id: z.string().optional().or(z.literal('')),
  layout_type: z.string().optional().or(z.literal('')),
  balcony_area: z.union([z.coerce.number(), z.nan()]).optional(),
  ceiling_height: z.union([z.coerce.number(), z.nan()]).optional(),
  has_balcony: z.boolean().default(false),
  has_terrace: z.boolean().default(false),
  has_loggia: z.boolean().default(false),
});

type ApartmentFormData = z.infer<typeof apartmentSchema>;

interface SectionOption {
  id: string;
  name: string;
}

interface StatusOption {
  id: string;
  name: string;
  color?: string;
}

interface ApartmentFormDialogProps {
  open: boolean;
  buildingId: string;
  apartmentId?: string | null;
  sections: SectionOption[];
  statuses: StatusOption[];
  onClose: () => void;
  onSaved?: () => void;
}

const defaultValues: ApartmentFormData = {
  section_id: '',
  number: '',
  floor: 1,
  rooms: 1,
  area: 30,
  price: 0,
  status_id: '',
  layout_type: '',
  balcony_area: undefined,
  ceiling_height: undefined,
  has_balcony: false,
  has_terrace: false,
  has_loggia: false,
};

const layoutTypes = ['studio', '1k', '2k', '3k', '4k', '5k', 'penthouse', 'other'];

function normalizeOptionalNumber(value: number | undefined) {
  return Number.isNaN(value) ? undefined : value;
}

export default function ApartmentFormDialog({
  open,
  buildingId,
  apartmentId,
  sections,
  statuses,
  onClose,
  onSaved,
}: ApartmentFormDialogProps) {
  const isEditMode = Boolean(apartmentId);
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const { data: apartmentData, isLoading } = useQuery({
    queryKey: ['apartment-dialog', apartmentId],
    queryFn: async () => {
      const response = await api.get(`/apartments/${apartmentId}`);
      return response.data.data;
    },
    enabled: open && isEditMode && !!apartmentId,
  });

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ApartmentFormData>({
    resolver: zodResolver(apartmentSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!isEditMode) {
      reset(defaultValues);
      return;
    }

    if (apartmentData) {
      reset({
        section_id: apartmentData.section_id ?? '',
        number: apartmentData.number ?? '',
        floor: apartmentData.floor ?? 1,
        rooms: apartmentData.rooms ?? 1,
        area: Number(apartmentData.area ?? 0),
        price: Number(apartmentData.price ?? 0),
        status_id: apartmentData.status_id ?? '',
        layout_type: apartmentData.layout_type ?? '',
        balcony_area: apartmentData.balcony_area == null ? undefined : Number(apartmentData.balcony_area),
        ceiling_height: apartmentData.ceiling_height == null ? undefined : Number(apartmentData.ceiling_height),
        has_balcony: Boolean(apartmentData.has_balcony),
        has_terrace: Boolean(apartmentData.has_terrace),
        has_loggia: Boolean(apartmentData.has_loggia),
      });
    }
  }, [apartmentData, isEditMode, open, reset]);

  const mutation = useMutation({
    mutationFn: (values: ApartmentFormData) => {
      const payload = {
        ...values,
        section_id: values.section_id || null,
        status_id: values.status_id || null,
        balcony_area: normalizeOptionalNumber(values.balcony_area),
        ceiling_height: normalizeOptionalNumber(values.ceiling_height),
      };

      return isEditMode
        ? api.put(`/apartments/${apartmentId}`, payload)
        : api.post(`/buildings/${buildingId}/apartments`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chessboard', buildingId] });
      queryClient.invalidateQueries({ queryKey: ['chessboard-filters', buildingId] });
      queryClient.invalidateQueries({ queryKey: ['building', buildingId] });
      if (apartmentId) {
        queryClient.invalidateQueries({ queryKey: ['apartment-dialog', apartmentId] });
      }
      addToast(isEditMode ? 'Apartment updated' : 'Apartment created', 'success');
      onSaved?.();
      onClose();
      reset(defaultValues);
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.message || 'Failed to save apartment', 'error');
    },
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{isEditMode ? 'Edit Apartment' : 'New Apartment'}</DialogTitle>
      {isEditMode && isLoading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : (
        <Box component="form" onSubmit={handleSubmit((values) => mutation.mutateAsync(values))}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller
                  name="number"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Apartment Number"
                      fullWidth
                      required
                      error={!!errors.number}
                      helperText={errors.number?.message}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller
                  name="floor"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Floor"
                      type="number"
                      fullWidth
                      required
                      error={!!errors.floor}
                      helperText={errors.floor?.message}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller
                  name="rooms"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Rooms"
                      type="number"
                      fullWidth
                      required
                      error={!!errors.rooms}
                      helperText={errors.rooms?.message}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller
                  name="area"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Area (m²)"
                      type="number"
                      fullWidth
                      required
                      error={!!errors.area}
                      helperText={errors.area?.message}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller
                  name="price"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Price"
                      type="number"
                      fullWidth
                      required
                      error={!!errors.price}
                      helperText={errors.price?.message}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller
                  name="status_id"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Status" select fullWidth>
                      <MenuItem value="">Unspecified</MenuItem>
                      {statuses.map((status) => (
                        <MenuItem key={status.id} value={status.id}>{status.name}</MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="section_id"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Section" select fullWidth>
                      <MenuItem value="">Main / None</MenuItem>
                      {sections.map((section) => (
                        <MenuItem key={section.id} value={section.id}>{section.name}</MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="layout_type"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Layout Type" select fullWidth>
                      <MenuItem value="">Unspecified</MenuItem>
                      {layoutTypes.map((type) => (
                        <MenuItem key={type} value={type}>{type}</MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="balcony_area"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} value={field.value ?? ''} label="Balcony Area (m²)" type="number" fullWidth />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="ceiling_height"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} value={field.value ?? ''} label="Ceiling Height (m)" type="number" fullWidth />
                  )}
                />
              </Grid>
              <Grid size={12}>
                <Box display="flex" gap={2} flexWrap="wrap">
                  <Controller
                    name="has_balcony"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />}
                        label="Balcony"
                      />
                    )}
                  />
                  <Controller
                    name="has_terrace"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />}
                        label="Terrace"
                      />
                    )}
                  />
                  <Controller
                    name="has_loggia"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />}
                        label="Loggia"
                      />
                    )}
                  />
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? (isEditMode ? 'Saving…' : 'Creating…') : (isEditMode ? 'Save Changes' : 'Create Apartment')}
            </Button>
          </DialogActions>
        </Box>
      )}
    </Dialog>
  );
}