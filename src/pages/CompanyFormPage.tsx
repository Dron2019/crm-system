import { useParams, useNavigate } from 'react-router-dom';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCompany } from '@/hooks/useCompanies';
import { useToastStore } from '@/stores/toastStore';

const companySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  domain: z.string().optional().or(z.literal('')),
  industry: z.string().optional().or(z.literal('')),
  size: z.string().optional().or(z.literal('')),
  annual_revenue: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  website: z.string().optional().or(z.literal('')),
  address_line_1: z.string().optional().or(z.literal('')),
  address_line_2: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  postal_code: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
});

type CompanyFormData = z.infer<typeof companySchema>;

const sizes = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001+'];

export default function CompanyFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const addToast = useToastStore((s) => s.addToast);

  const { data: company, isLoading: companyLoading } = useCompany(id ?? '');

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    values: isEdit && company ? {
      name: company.name ?? '',
      domain: company.domain ?? '',
      industry: company.industry ?? '',
      size: company.size ?? '',
      annual_revenue: company.annual_revenue ?? '',
      phone: company.phone ?? '',
      website: company.website ?? '',
      address_line_1: company.address_line_1 ?? '',
      address_line_2: company.address_line_2 ?? '',
      city: company.city ?? '',
      state: company.state ?? '',
      postal_code: company.postal_code ?? '',
      country: company.country ?? '',
    } : {
      name: '', domain: '', industry: '', size: '', annual_revenue: '',
      phone: '', website: '', address_line_1: '', address_line_2: '',
      city: '', state: '', postal_code: '', country: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: CompanyFormData) =>
      isEdit ? api.put(`/companies/${id}`, data) : api.post('/companies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      if (id) queryClient.invalidateQueries({ queryKey: ['companies', id] });
      addToast(isEdit ? 'Company updated' : 'Company created');
      navigate(isEdit ? `/companies/${id}` : '/companies');
    },
  });

  if (isEdit && companyLoading) {
    return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={500} mb={3}>
        {isEdit ? 'Edit Company' : 'New Company'}
      </Typography>
      <Card>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit((data) => mutation.mutateAsync(data))}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="name" control={control} render={({ field }) => (
                  <TextField {...field} label="Company Name" fullWidth required error={!!errors.name} helperText={errors.name?.message} />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="domain" control={control} render={({ field }) => (
                  <TextField {...field} label="Domain" fullWidth placeholder="example.com" />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="industry" control={control} render={({ field }) => (
                  <TextField {...field} label="Industry" fullWidth />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="size" control={control} render={({ field }) => (
                  <TextField {...field} label="Company Size" fullWidth select>
                    <MenuItem value="">—</MenuItem>
                    {sizes.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </TextField>
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="annual_revenue" control={control} render={({ field }) => (
                  <TextField {...field} label="Annual Revenue" fullWidth type="number" />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="phone" control={control} render={({ field }) => (
                  <TextField {...field} label="Phone" fullWidth />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="website" control={control} render={({ field }) => (
                  <TextField {...field} label="Website" fullWidth placeholder="https://example.com" />
                )} />
              </Grid>

              <Grid size={12}>
                <Typography variant="subtitle2" color="text.secondary" mt={1}>Address</Typography>
              </Grid>
              <Grid size={12}>
                <Controller name="address_line_1" control={control} render={({ field }) => (
                  <TextField {...field} label="Address Line 1" fullWidth />
                )} />
              </Grid>
              <Grid size={12}>
                <Controller name="address_line_2" control={control} render={({ field }) => (
                  <TextField {...field} label="Address Line 2" fullWidth />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller name="city" control={control} render={({ field }) => (
                  <TextField {...field} label="City" fullWidth />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller name="state" control={control} render={({ field }) => (
                  <TextField {...field} label="State / Province" fullWidth />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller name="postal_code" control={control} render={({ field }) => (
                  <TextField {...field} label="Postal Code" fullWidth />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="country" control={control} render={({ field }) => (
                  <TextField {...field} label="Country" fullWidth />
                )} />
              </Grid>
            </Grid>

            {mutation.isError && (
              <Typography color="error" mt={2} variant="body2">
                Failed to save company. Please try again.
              </Typography>
            )}

            <Box display="flex" gap={2} mt={3}>
              <Button variant="contained" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : isEdit ? 'Update Company' : 'Create Company'}
              </Button>
              <Button variant="outlined" onClick={() => navigate(isEdit ? `/companies/${id}` : '/companies')}>
                Cancel
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
