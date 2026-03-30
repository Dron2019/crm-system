import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  MenuItem,
  Grid2 as Grid,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProjectFormData>({
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

  const mutation = useMutation({
    mutationFn: (data: ProjectFormData) => api.post('/projects', data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      const projectId = response.data?.data?.id;
      addToast('Project created', 'success');
      if (projectId) {
        navigate(`/objects/${projectId}/buildings`);
        return;
      }
      navigate('/objects');
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.message || 'Failed to create project', 'error');
    },
  });

  return (
    <Box>
      <Typography variant="h5" fontWeight={500} mb={3}>
        New Project
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
                {mutation.isPending ? 'Creating…' : 'Create Project'}
              </Button>
              <Button variant="outlined" onClick={() => navigate('/objects')}>
                Cancel
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
