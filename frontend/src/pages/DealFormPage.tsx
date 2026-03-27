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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useDeal, usePipelines } from '@/hooks/useDeals';
import { useContacts } from '@/hooks/useContacts';
import { useCompanies } from '@/hooks/useCompanies';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useToastStore } from '@/stores/toastStore';
import CustomFieldRenderer, { type CustomFieldDefinition } from '@/components/CustomFieldRenderer';

const dealSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  value: z.string().min(1, 'Value is required'),
  currency: z.string().default('USD'),
  pipeline_id: z.string().min(1, 'Pipeline is required'),
  stage_id: z.string().min(1, 'Stage is required'),
  contact_id: z.string().optional().or(z.literal('')),
  company_id: z.string().optional().or(z.literal('')),
  assigned_to: z.string().optional().or(z.literal('')),
  probability: z.coerce.number().min(0).max(100).default(0),
  expected_close_date: z.string().optional().or(z.literal('')),
  status: z.string().default('open'),
  custom_fields: z.record(z.any()).optional(),
});

type DealFormData = z.infer<typeof dealSchema>;

const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR'];
const statuses = ['open', 'won', 'lost'];

export default function DealFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const addToast = useToastStore((s) => s.addToast);

  const { data: deal, isLoading: dealLoading } = useDeal(id ?? '');
  const { data: pipelines } = usePipelines();
  const { data: contactsData } = useContacts({ per_page: 100 });
  const { data: companiesData } = useCompanies({ per_page: 100 });
  const { data: teamMembersData } = useTeamMembers();
  const { data: customFields } = useQuery<CustomFieldDefinition[]>({
    queryKey: ['custom-fields', 'deal'],
    queryFn: async () => {
      const { data } = await api.get('/custom-fields', { params: { entity_type: 'deal' } });
      return data.data;
    },
  });

  const defaultPipelineId = pipelines?.[0]?.id ?? '';
  const defaultStageId = pipelines?.[0]?.stages?.[0]?.id ?? '';
  const teamMembers = teamMembersData?.data ?? [];

  const { control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    values: isEdit && deal ? {
      title: deal.title ?? '',
      value: deal.value ?? '',
      currency: deal.currency ?? 'USD',
      pipeline_id: deal.pipeline?.id ?? defaultPipelineId,
      stage_id: deal.stage?.id ?? defaultStageId,
      contact_id: deal.contact?.id ?? '',
      company_id: deal.company?.id ?? '',
      assigned_to: deal.assigned_to?.id ?? '',
      probability: deal.probability ?? 0,
      expected_close_date: deal.expected_close_date?.split('T')[0] ?? '',
      status: deal.status ?? 'open',
      custom_fields: deal.custom_fields ?? {},
    } : {
      title: '', value: '', currency: 'USD',
      pipeline_id: defaultPipelineId,
      stage_id: defaultStageId,
      contact_id: '', company_id: '',
      assigned_to: '',
      probability: 0, expected_close_date: '', status: 'open',
      custom_fields: {},
    },
  });

  const selectedPipelineId = watch('pipeline_id');
  const selectedPipeline = pipelines?.find((p) => p.id === selectedPipelineId);
  const stages = selectedPipeline?.stages?.slice().sort((a, b) => a.display_order - b.display_order) ?? [];

  const mutation = useMutation({
    mutationFn: (data: DealFormData) =>
      isEdit ? api.put(`/deals/${id}`, data) : api.post('/deals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      if (id) queryClient.invalidateQueries({ queryKey: ['deals', id] });
      addToast(isEdit ? 'Deal updated' : 'Deal created');
      navigate(isEdit ? `/deals/${id}` : '/deals');
    },
  });

  if (isEdit && dealLoading) {
    return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        {isEdit ? 'Edit Deal' : 'New Deal'}
      </Typography>
      <Card>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit((data) => mutation.mutateAsync(data))}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <Controller name="title" control={control} render={({ field }) => (
                  <TextField {...field} label="Deal Title" fullWidth required error={!!errors.title} helperText={errors.title?.message} />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller name="value" control={control} render={({ field }) => (
                  <TextField {...field} label="Value" fullWidth required type="number" error={!!errors.value} helperText={errors.value?.message} />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller name="currency" control={control} render={({ field }) => (
                  <TextField {...field} label="Currency" fullWidth select>
                    {currencies.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </TextField>
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller name="status" control={control} render={({ field }) => (
                  <TextField {...field} label="Status" fullWidth select>
                    {statuses.map((s) => <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s}</MenuItem>)}
                  </TextField>
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="pipeline_id" control={control} render={({ field }) => (
                  <TextField {...field} label="Pipeline" fullWidth select required error={!!errors.pipeline_id}>
                    {pipelines?.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                  </TextField>
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="stage_id" control={control} render={({ field }) => (
                  <TextField {...field} label="Stage" fullWidth select required error={!!errors.stage_id}>
                    {stages.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box width={10} height={10} borderRadius="50%" bgcolor={s.color || '#6366f1'} />
                          {s.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </TextField>
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="contact_id" control={control} render={({ field }) => (
                  <TextField {...field} label="Contact" fullWidth select>
                    <MenuItem value="">— None —</MenuItem>
                    {contactsData?.data?.map((c) => (
                      <MenuItem key={c.id} value={c.id}>{c.full_name}</MenuItem>
                    ))}
                  </TextField>
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="company_id" control={control} render={({ field }) => (
                  <TextField {...field} label="Company" fullWidth select>
                    <MenuItem value="">— None —</MenuItem>
                    {companiesData?.data?.map((c) => (
                      <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                    ))}
                  </TextField>
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="assigned_to" control={control} render={({ field }) => (
                  <TextField {...field} label="Responsible" fullWidth select>
                    <MenuItem value="">— Unassigned —</MenuItem>
                    {teamMembers.map((member) => (
                      <MenuItem key={member.id} value={member.id}>{member.name}</MenuItem>
                    ))}
                  </TextField>
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="probability" control={control} render={({ field }) => (
                  <TextField {...field} label="Probability (%)" fullWidth type="number" inputProps={{ min: 0, max: 100 }} />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="expected_close_date" control={control} render={({ field }) => (
                  <TextField {...field} label="Expected Close Date" fullWidth type="date" slotProps={{ inputLabel: { shrink: true } }} />
                )} />
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

            {mutation.isError && (
              <Typography color="error" mt={2} variant="body2">Failed to save deal. Please try again.</Typography>
            )}

            <Box display="flex" gap={2} mt={3}>
              <Button variant="contained" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : isEdit ? 'Update Deal' : 'Create Deal'}
              </Button>
              <Button variant="outlined" onClick={() => navigate(isEdit ? `/deals/${id}` : '/deals')}>
                Cancel
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
