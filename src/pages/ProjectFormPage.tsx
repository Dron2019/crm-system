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
import type { Project } from '@/types';

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  brand: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  status: z.string().default('planning'),
  start_date: z.string().optional().or(z.literal('')),
  delivery_date: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
});

type ProjectFormData = z.infer<typeof projectSchema>;

const statuses = ['planning', 'construction', 'sales', 'completed', 'archived'];

export default function ProjectFormPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const isEditMode = Boolean(projectId);

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      brand: '',
      city: '',
      country: '',
      address: '',
      status: 'planning',
      start_date: '',
      delivery_date: '',
      description: '',
    },
  });

  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ['project-form', projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}`);
      return response.data.data as Project;
    },
    enabled: isEditMode && !!projectId,
  });

  useEffect(() => {
    if (!projectData) {
      return;
    }

    reset({
      name: projectData.name ?? '',
      brand: projectData.brand ?? '',
      city: projectData.city ?? '',
      country: projectData.country ?? '',
      address: projectData.address ?? '',
      status: projectData.status ?? 'planning',
      start_date: projectData.start_date ?? '',
      delivery_date: projectData.delivery_date ?? '',
      description: projectData.description ?? '',
    });
  }, [projectData, reset]);

  const mutation = useMutation({
    mutationFn: (data: ProjectFormData) => (
      isEditMode && projectId
        ? api.put(`/projects/${projectId}`, data)
        : api.post('/projects', data)
    ),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      }

      const targetProjectId = projectId || response.data?.data?.id;
      addToast(isEditMode ? 'Project updated' : 'Project created', 'success');
      if (targetProjectId) {
        navigate(`/objects/${targetProjectId}/buildings`);
        return;
      }
      navigate('/objects');
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} project`, 'error');
    },
  });

  if (projectLoading) {
    return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={500} mb={3}>
        {isEditMode ? 'Edit Project' : 'New Project'}
      </Typography>
      <Card>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit((data) => mutation.mutateAsync(data))}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="name" control={control} render={({ field }) => (
                  <TextField {...field} label="Project Name" fullWidth required error={!!errors.name} helperText={errors.name?.message} />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="brand" control={control} render={({ field }) => (
                  <TextField {...field} label="Brand" fullWidth />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller name="city" control={control} render={({ field }) => (
                  <TextField {...field} label="City" fullWidth />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller name="country" control={control} render={({ field }) => (
                  <TextField {...field} label="Country" fullWidth />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
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
                <Controller name="start_date" control={control} render={({ field }) => (
                  <TextField {...field} label="Start Date" type="date" fullWidth slotProps={{ inputLabel: { shrink: true } }} />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="delivery_date" control={control} render={({ field }) => (
                  <TextField {...field} label="Delivery Date" type="date" fullWidth slotProps={{ inputLabel: { shrink: true } }} />
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
                {mutation.isPending ? (isEditMode ? 'Saving…' : 'Creating…') : (isEditMode ? 'Save Changes' : 'Create Project')}
              </Button>
              <Button variant="outlined" onClick={() => navigate(projectId ? `/objects/${projectId}/buildings` : '/objects')}>
                Cancel
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
