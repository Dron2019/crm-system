import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid2 as Grid,
  TextField,
  Button,
  MenuItem,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import api from '@/lib/api';
import { useContact } from '@/hooks/useContacts';
import { useToastStore } from '@/stores/toastStore';
import { useState } from 'react';
import CustomFieldRenderer, { type CustomFieldDefinition } from '@/components/CustomFieldRenderer';

const contactSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(255),
  last_name: z.string().max(255).optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  mobile: z.string().max(50).optional().or(z.literal('')),
  job_title: z.string().max(255).optional().or(z.literal('')),
  source: z.string().max(100).optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'lead', 'customer']),
  custom_fields: z.record(z.any()).optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

const sourceOptions = ['website', 'referral', 'linkedin', 'conference', 'cold_email', 'advertisement', 'other'];
const statusOptions = ['active', 'inactive', 'lead', 'customer'];

export default function ContactFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;
  const [error, setError] = useState('');
  const addToast = useToastStore((s) => s.addToast);

  const { data: existingContact, isLoading: isLoadingContact } = useContact(id ?? '');
  const { data: customFields } = useQuery<CustomFieldDefinition[]>({
    queryKey: ['custom-fields', 'contact'],
    queryFn: async () => {
      const { data } = await api.get('/custom-fields', { params: { entity_type: 'contact' } });
      return data.data;
    },
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    values: isEditing && existingContact ? {
      first_name: existingContact.first_name,
      last_name: existingContact.last_name ?? '',
      email: existingContact.email ?? '',
      phone: existingContact.phone ?? '',
      mobile: existingContact.mobile ?? '',
      job_title: existingContact.job_title ?? '',
      source: existingContact.source ?? '',
      status: (existingContact.status as ContactFormData['status']) ?? 'active',
      custom_fields: existingContact.custom_fields ?? {},
    } : {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      mobile: '',
      job_title: '',
      source: '',
      status: 'lead',
      custom_fields: {},
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      // Strip empty strings to null-ish for optional fields
      const payload = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
      );
      if (isEditing) {
        return api.put(`/contacts/${id}`, payload);
      }
      return api.post('/contacts', payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      addToast(isEditing ? 'Contact updated' : 'Contact created');
      const contactId = isEditing ? id : res.data.data.id;
      navigate(`/contacts/${contactId}`);
    },
    onError: () => {
      setError('Failed to save contact. Please check your input and try again.');
    },
  });

  if (isEditing && isLoadingContact) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={() => navigate(isEditing ? `/contacts/${id}` : '/contacts')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight={700}>
          {isEditing ? 'Edit Contact' : 'New Contact'}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit((data) => mutation.mutate(data))} noValidate>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  {...register('first_name')}
                  label="First Name"
                  fullWidth
                  required
                  error={!!errors.first_name}
                  helperText={errors.first_name?.message}
                  autoFocus
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  {...register('last_name')}
                  label="Last Name"
                  fullWidth
                  error={!!errors.last_name}
                  helperText={errors.last_name?.message}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  {...register('email')}
                  label="Email"
                  type="email"
                  fullWidth
                  error={!!errors.email}
                  helperText={errors.email?.message}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  {...register('phone')}
                  label="Phone"
                  fullWidth
                  error={!!errors.phone}
                  helperText={errors.phone?.message}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  {...register('mobile')}
                  label="Mobile"
                  fullWidth
                  error={!!errors.mobile}
                  helperText={errors.mobile?.message}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  {...register('job_title')}
                  label="Job Title"
                  fullWidth
                  error={!!errors.job_title}
                  helperText={errors.job_title?.message}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Status"
                      fullWidth
                      error={!!errors.status}
                      helperText={errors.status?.message}
                    >
                      {statusOptions.map((s) => (
                        <MenuItem key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="source"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Source"
                      fullWidth
                    >
                      <MenuItem value="">None</MenuItem>
                      {sourceOptions.map((s) => (
                        <MenuItem key={s} value={s}>
                          {s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>

              {customFields && customFields.length > 0 && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle1" fontWeight={700} mb={1}>
                    Custom Fields
                  </Typography>
                  <Grid container spacing={2}>
                    {customFields.map((field) => (
                        <Grid key={field.id} size={{ xs: 12, sm: 6 }}>
                          <CustomFieldRenderer field={field} control={control} />
                        </Grid>
                    ))}
                  </Grid>
                </Grid>
              )}
            </Grid>

            <Box display="flex" justifyContent="flex-end" gap={2} mt={4}>
              <Button
                variant="outlined"
                onClick={() => navigate(isEditing ? `/contacts/${id}` : '/contacts')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={isSubmitting || mutation.isPending}
              >
                {isSubmitting || mutation.isPending ? 'Saving...' : isEditing ? 'Update Contact' : 'Create Contact'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
