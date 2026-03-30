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

const apartmentSchema = z.object({
  section_id: z.string().optional().or(z.literal('')),
  number: z.string().min(1, 'Apartment number is required'),
  floor: z.coerce.number().min(0, 'Floor is required'),
  rooms: z.coerce.number().min(1, 'Rooms is required'),
  area: z.coerce.number().min(1, 'Area is required'),
  price: z.coerce.number().min(0, 'Price is required'),
  layout_type: z.string().optional().or(z.literal('')),
  balcony_area: z.coerce.number().optional(),
  has_balcony: z.boolean().default(false),
  has_terrace: z.boolean().default(false),
  has_loggia: z.boolean().default(false),
  ceiling_height: z.coerce.number().optional(),
});

type ApartmentFormData = z.infer<typeof apartmentSchema>;

const layoutTypes = ['studio', '1k', '2k', '3k', '4k', '5k', 'penthouse', 'other'];

export default function ApartmentFormPage() {
  const { projectId, buildingId } = useParams<{ projectId: string; buildingId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const { data: buildingData, isLoading: buildingLoading } = useQuery({
    queryKey: ['building', buildingId],
    queryFn: async () => {
      const response = await api.get(`/buildings/${buildingId}`);
      return response.data.data;
    },
    enabled: !!buildingId,
  });

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<ApartmentFormData>({
    resolver: zodResolver(apartmentSchema),
    defaultValues: {
      section_id: '',
      number: '',
      floor: 1,
      rooms: 1,
      area: 30,
      price: 0,
      layout_type: '',
      has_balcony: false,
      has_terrace: false,
      has_loggia: false,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: ApartmentFormData) =>
      api.post(`/buildings/${buildingId}/apartments`, {
        ...data,
        section_id: data.section_id || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chessboard', buildingId] });
      queryClient.invalidateQueries({ queryKey: ['building', buildingId] });
      addToast('Apartment created', 'success');
      navigate(`/objects/${projectId}/buildings/${buildingId}/chessboard`);
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.message || 'Failed to create apartment', 'error');
    },
  });

  if (buildingLoading) {
    return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;
  }

  const sections = buildingData?.sections ?? [];

  return (
    <Box>
      <Typography variant="h5" fontWeight={500} mb={3}>
        New Apartment
      </Typography>
      <Card>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit((data) => mutation.mutateAsync(data))}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller name="number" control={control} render={({ field }) => (
                  <TextField {...field} label="Apartment Number" fullWidth required error={!!errors.number} helperText={errors.number?.message} />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller name="floor" control={control} render={({ field }) => (
                  <TextField {...field} label="Floor" fullWidth required type="number" error={!!errors.floor} helperText={errors.floor?.message} />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller name="rooms" control={control} render={({ field }) => (
                  <TextField {...field} label="Rooms" fullWidth required type="number" error={!!errors.rooms} helperText={errors.rooms?.message} />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="area" control={control} render={({ field }) => (
                  <TextField {...field} label="Area (m²)" fullWidth required type="number" error={!!errors.area} helperText={errors.area?.message} />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="price" control={control} render={({ field }) => (
                  <TextField {...field} label="Price" fullWidth required type="number" error={!!errors.price} helperText={errors.price?.message} />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="section_id" control={control} render={({ field }) => (
                  <TextField {...field} label="Section" fullWidth select>
                    <MenuItem value="">Main / None</MenuItem>
                    {sections.map((section: any) => (
                      <MenuItem key={section.id} value={section.id}>{section.name}</MenuItem>
                    ))}
                  </TextField>
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="layout_type" control={control} render={({ field }) => (
                  <TextField {...field} label="Layout Type" fullWidth select>
                    <MenuItem value="">—</MenuItem>
                    {layoutTypes.map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
                  </TextField>
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="balcony_area" control={control} render={({ field }) => (
                  <TextField {...field} label="Balcony Area (m²)" fullWidth type="number" />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="ceiling_height" control={control} render={({ field }) => (
                  <TextField {...field} label="Ceiling Height (m)" fullWidth type="number" />
                )} />
              </Grid>
            </Grid>

            <Box display="flex" gap={2} mt={3}>
              <Button variant="contained" type="submit" disabled={isSubmitting || mutation.isPending}>
                {mutation.isPending ? 'Creating…' : 'Create Apartment'}
              </Button>
              <Button variant="outlined" onClick={() => navigate(`/objects/${projectId}/buildings/${buildingId}/chessboard`)}>
                Cancel
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
