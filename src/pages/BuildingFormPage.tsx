import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  MenuItem,
  Grid2 as Grid,
  CircularProgress,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import type { Building } from '@/types';

const buildingSchema = z.object({
  name: z.string().min(1, 'Building name is required'),
  number: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  total_floors: z.coerce.number().min(1).optional(),
  total_apartments: z.coerce.number().min(0).optional(),
  status: z.string().default('planning'),
  construction_start: z.string().optional().or(z.literal('')),
  completion_date: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
});

type BuildingFormData = z.infer<typeof buildingSchema>;

const statuses = ['planning', 'construction', 'ready', 'populated', 'archived'];

export default function BuildingFormPage() {
  const { projectId, buildingId } = useParams<{ projectId: string; buildingId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const isEditMode = Boolean(buildingId);

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<BuildingFormData>({
    resolver: zodResolver(buildingSchema),
    defaultValues: {
      name: '',
      number: '',
      city: '',
      address: '',
      status: 'planning',
      description: '',
      construction_start: '',
      completion_date: '',
    },
  });

  const { data: buildingData, isLoading: buildingLoading } = useQuery({
    queryKey: ['building-form', buildingId],
    queryFn: async () => {
      const response = await api.get(`/buildings/${buildingId}`);
      return response.data.data as Building;
    },
    enabled: isEditMode && !!buildingId,
  });

  useEffect(() => {
    if (!buildingData) {
      return;
    }

    reset({
      name: buildingData.name ?? '',
      number: buildingData.number ?? '',
      city: buildingData.city ?? '',
      address: buildingData.address ?? '',
      total_floors: buildingData.total_floors ?? undefined,
      total_apartments: buildingData.total_apartments ?? undefined,
      status: buildingData.status ?? 'planning',
      construction_start: buildingData.construction_start ?? '',
      completion_date: buildingData.completion_date ?? '',
      description: buildingData.description ?? '',
    });
  }, [buildingData, reset]);

  const mutation = useMutation({
    mutationFn: (data: BuildingFormData) => (
      isEditMode && buildingId
        ? api.put(`/buildings/${buildingId}`, data)
        : api.post(`/projects/${projectId}/buildings`, data)
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      if (buildingId) {
        queryClient.invalidateQueries({ queryKey: ['building', buildingId] });
      }
      addToast(isEditMode ? 'Building updated' : 'Building created', 'success');
      navigate(`/objects/${projectId}/buildings`);
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} building`, 'error');
    },
  });

  if (buildingLoading) {
    return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={500} mb={3}>
        {isEditMode ? 'Edit Building' : 'New Building'}
      </Typography>
      <Card>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit((data) => mutation.mutateAsync(data))}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="name" control={control} render={({ field }) => (
                  <TextField {...field} label="Building Name" fullWidth required error={!!errors.name} helperText={errors.name?.message} />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="number" control={control} render={({ field }) => (
                  <TextField {...field} label="Building Number" fullWidth />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="city" control={control} render={({ field }) => (
                  <TextField {...field} label="City" fullWidth />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="status" control={control} render={({ field }) => (
                  <TextField {...field} label="Status" fullWidth select>
                    {statuses.map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
                  </TextField>
                )} />
              </Grid>
              <Grid size={12}>
                <Controller name="address" control={control} render={({ field }) => (
                  <TextField {...field} label="Address" fullWidth />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="total_floors" control={control} render={({ field }) => (
                  <TextField {...field} label="Total Floors" type="number" fullWidth />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="total_apartments" control={control} render={({ field }) => (
                  <TextField {...field} label="Total Apartments" type="number" fullWidth />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="construction_start" control={control} render={({ field }) => (
                  <TextField {...field} label="Construction Start" type="date" fullWidth slotProps={{ inputLabel: { shrink: true } }} />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="completion_date" control={control} render={({ field }) => (
                  <TextField {...field} label="Completion Date" type="date" fullWidth slotProps={{ inputLabel: { shrink: true } }} />
                )} />
              </Grid>
              <Grid size={12}>
                <Controller name="description" control={control} render={({ field }) => (
                  <TextField {...field} label="Description" fullWidth multiline minRows={3} />
                )} />
              </Grid>
            </Grid>

            <Box display="flex" gap={2} mt={3}>
              <Button variant="contained" type="submit" disabled={isSubmitting || mutation.isPending}>
                {mutation.isPending ? (isEditMode ? 'Saving…' : 'Creating…') : (isEditMode ? 'Save Changes' : 'Create Building')}
              </Button>
              <Button variant="outlined" onClick={() => navigate(`/objects/${projectId}/buildings`)}>
                Cancel
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
