import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  MenuItem,
  Tooltip,
  CircularProgress,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useActivities } from '@/hooks/useActivities';
import { useDeals } from '@/hooks/useDeals';
import { useContacts } from '@/hooks/useContacts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';

const activityTypes = ['call', 'email', 'meeting', 'task', 'note'];

const typeColors: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error'> = {
  call: 'primary',
  email: 'info',
  meeting: 'warning',
  task: 'secondary',
  note: 'success',
};

const activitySchema = z.object({
  type: z.string().min(1, 'Type is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().or(z.literal('')),
  scheduled_at: z.string().optional().or(z.literal('')),
  subject_type: z.string().min(1, 'Subject type is required'),
  subject_id: z.string().min(1, 'Subject is required'),
});

type ActivityFormData = z.infer<typeof activitySchema>;

export default function ActivitiesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(Number(searchParams.get('page') ?? 0));
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') ?? '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('is_completed') ?? '');
  const [subjectTypeFilter, setSubjectTypeFilter] = useState(searchParams.get('subject_type') ?? '');
  const [searchText, setSearchText] = useState(searchParams.get('search') ?? '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') ?? 'created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    (searchParams.get('direction') as 'asc' | 'desc') ?? 'desc',
  );
  const [customKey, setCustomKey] = useState(searchParams.get('custom_key') ?? '');
  const [customValue, setCustomValue] = useState(searchParams.get('custom_value') ?? '');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading } = useActivities({
    page: page + 1,
    per_page: 20,
    type: typeFilter || undefined,
    is_completed: statusFilter ? statusFilter === '1' : undefined,
    sort: sortBy,
    direction: sortDirection,
  });

  const { data: dealsData } = useDeals({ per_page: 100 });
  const { data: contactsData } = useContacts({ per_page: 100 });

  const toggleMutation = useMutation({
    mutationFn: (activity: { id: string; is_completed: boolean }) =>
      api.put(`/activities/${activity.id}`, {
        completed_at: activity.is_completed ? null : new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ActivityFormData) => api.post('/activities', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setDialogOpen(false);
      reset();
    },
  });

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: { type: 'task', title: '', description: '', scheduled_at: '', subject_type: 'deal', subject_id: '' },
  });

  const watchSubjectType = watch('subject_type');

  const filteredActivities = useMemo(() => {
    return (data?.data ?? []).filter((activity) => {
      if (subjectTypeFilter && !activity.subject_type.toLowerCase().includes(subjectTypeFilter.toLowerCase())) {
        return false;
      }
      if (searchText) {
        const hay = `${activity.title} ${activity.description ?? ''}`.toLowerCase();
        if (!hay.includes(searchText.toLowerCase())) return false;
      }
      if (customKey && customValue) {
        const metadata = activity.metadata ?? {};
        const actual = metadata[customKey];
        if (!String(actual ?? '').toLowerCase().includes(customValue.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [data?.data, subjectTypeFilter, searchText, customKey, customValue]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (page) next.set('page', String(page));
    if (typeFilter) next.set('type', typeFilter);
    if (statusFilter) next.set('is_completed', statusFilter);
    if (subjectTypeFilter) next.set('subject_type', subjectTypeFilter);
    if (searchText) next.set('search', searchText);
    if (sortBy) next.set('sort', sortBy);
    if (sortDirection) next.set('direction', sortDirection);
    if (customKey) next.set('custom_key', customKey);
    if (customValue) next.set('custom_value', customValue);
    setSearchParams(next, { replace: true });
  }, [page, typeFilter, statusFilter, subjectTypeFilter, searchText, sortBy, sortDirection, customKey, customValue, setSearchParams]);

  const resetFilters = () => {
    setPage(0);
    setTypeFilter('');
    setStatusFilter('');
    setSubjectTypeFilter('');
    setSearchText('');
    setSortBy('created_at');
    setSortDirection('desc');
    setCustomKey('');
    setCustomValue('');
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={500}>Activities</Typography>
        <Box display="flex" gap={1}>
          <TextField
            size="small"
            value={searchText}
            label="Search"
            onChange={(e) => { setSearchText(e.target.value); setPage(0); }}
            sx={{ minWidth: 170 }}
          />
          <TextField
            select
            size="small"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
            sx={{ minWidth: 140 }}
            label="Type"
          >
            <MenuItem value="">All Types</MenuItem>
            {activityTypes.map((t) => (
              <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            sx={{ minWidth: 120 }}
            label="Status"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="0">Pending</MenuItem>
            <MenuItem value="1">Done</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            value={subjectTypeFilter}
            onChange={(e) => { setSubjectTypeFilter(e.target.value); setPage(0); }}
            sx={{ minWidth: 140 }}
            label="Related To"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="deal">Deal</MenuItem>
            <MenuItem value="contact">Contact</MenuItem>
            <MenuItem value="company">Company</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(0); }}
            sx={{ minWidth: 140 }}
            label="Sort"
          >
            <MenuItem value="created_at">Created</MenuItem>
            <MenuItem value="scheduled_at">Scheduled</MenuItem>
            <MenuItem value="title">Title</MenuItem>
            <MenuItem value="type">Type</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            value={sortDirection}
            onChange={(e) => { setSortDirection(e.target.value as 'asc' | 'desc'); setPage(0); }}
            sx={{ minWidth: 120 }}
            label="Direction"
          >
            <MenuItem value="asc">Asc</MenuItem>
            <MenuItem value="desc">Desc</MenuItem>
          </TextField>
          <TextField
            size="small"
            value={customKey}
            onChange={(e) => { setCustomKey(e.target.value); setPage(0); }}
            sx={{ minWidth: 130 }}
            label="Custom Key"
          />
          <TextField
            size="small"
            value={customValue}
            onChange={(e) => { setCustomValue(e.target.value); setPage(0); }}
            sx={{ minWidth: 140 }}
            label="Custom Value"
          />
          <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={resetFilters}>
            Reset
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            Log Activity
          </Button>
        </Box>
      </Box>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell>Type</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Scheduled</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredActivities.map((activity) => (
                  <TableRow key={activity.id} hover>
                    <TableCell padding="checkbox">
                      <Tooltip title={activity.is_completed ? 'Mark incomplete' : 'Mark complete'}>
                        <IconButton
                          size="small"
                          onClick={() => toggleMutation.mutate({ id: activity.id, is_completed: activity.is_completed })}
                        >
                          {activity.is_completed
                            ? <CheckCircleIcon color="success" />
                            : <RadioButtonUncheckedIcon color="action" />
                          }
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={activity.type}
                        size="small"
                        color={typeColors[activity.type] ?? 'default'}
                        variant="outlined"
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{
                          textDecoration: activity.is_completed ? 'line-through' : 'none',
                          cursor: 'pointer',
                          '&:hover': { color: 'primary.main' },
                        }}
                        onClick={() => navigate(`/activities/${activity.id}`)}
                      >
                        {activity.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 300 }}>
                        {activity.description || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {activity.scheduled_at
                        ? new Date(activity.scheduled_at).toLocaleString()
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={activity.is_completed ? 'Done' : 'Pending'}
                        size="small"
                        color={activity.is_completed ? 'success' : 'warning'}
                        variant="filled"
                        sx={{ fontWeight: 600, fontSize: 11 }}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(activity.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredActivities.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No activities found.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {data?.meta && (
            <TablePagination
              component="div"
              count={data.meta.total}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={20}
              rowsPerPageOptions={[20]}
            />
          )}
        </Paper>
      )}

      {/* Quick-add dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Log Activity</DialogTitle>
        <DialogContent>
          <Box component="form" id="activity-form" onSubmit={handleSubmit((d) => createMutation.mutateAsync(d))} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Controller name="type" control={control} render={({ field }) => (
              <TextField {...field} label="Type" select fullWidth error={!!errors.type}>
                {activityTypes.map((t) => (
                  <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t}</MenuItem>
                ))}
              </TextField>
            )} />
            <Controller name="title" control={control} render={({ field }) => (
              <TextField {...field} label="Title" fullWidth required error={!!errors.title} helperText={errors.title?.message} />
            )} />
            <Controller name="description" control={control} render={({ field }) => (
              <TextField {...field} label="Description" fullWidth multiline rows={3} />
            )} />
            <Controller name="scheduled_at" control={control} render={({ field }) => (
              <TextField {...field} label="Scheduled At" fullWidth type="datetime-local" slotProps={{ inputLabel: { shrink: true } }} />
            )} />
            <Controller name="subject_type" control={control} render={({ field }) => (
              <TextField {...field} label="Related To" select fullWidth required error={!!errors.subject_type}>
                <MenuItem value="deal">Deal</MenuItem>
                <MenuItem value="contact">Contact</MenuItem>
              </TextField>
            )} />
            <Controller name="subject_id" control={control} render={({ field }) => (
              <TextField {...field} label={watchSubjectType === 'deal' ? 'Deal' : 'Contact'} select fullWidth required error={!!errors.subject_id} helperText={errors.subject_id?.message}>
                <MenuItem value="">
                  <em>Select...</em>
                </MenuItem>
                {watchSubjectType === 'deal'
                  ? dealsData?.data?.map((d) => (
                      <MenuItem key={d.id} value={d.id}>{d.title}</MenuItem>
                    ))
                  : contactsData?.data?.map((c) => (
                      <MenuItem key={c.id} value={c.id}>{c.full_name}</MenuItem>
                    ))}
              </TextField>
            )} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" type="submit" form="activity-form" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
