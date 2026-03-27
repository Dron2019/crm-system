import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import AddIcon from '@mui/icons-material/Add';
import { useActivities } from '@/hooks/useActivities';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Activity } from '@/types';

const activityTypes = ['call', 'email', 'meeting', 'task', 'note', 'other'];

const typeChipColors: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error'> = {
  call: 'primary',
  email: 'info',
  meeting: 'warning',
  task: 'secondary',
  note: 'success',
  other: 'error',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const activitySchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().or(z.literal('')),
  scheduled_at: z.string().min(1, 'Date is required'),
});

type ActivityFormData = z.infer<typeof activitySchema>;

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: { date: number; inMonth: boolean; dateObj: Date }[] = [];

  // Previous month padding
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    days.push({ date: d, inMonth: false, dateObj: new Date(year, month - 1, d) });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ date: d, inMonth: true, dateObj: new Date(year, month, d) });
  }

  // Next month padding
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    days.push({ date: d, inMonth: false, dateObj: new Date(year, month + 1, d) });
  }

  return days;
}

function formatDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, setSelectedDate] = useState('');

  // Fetch activities for the visible range
  const { data, isLoading } = useActivities({
    per_page: 200,
    sort: 'scheduled_at',
    direction: 'asc',
  });

  const activitiesByDate = useMemo(() => {
    const map = new Map<string, Activity[]>();
    data?.data?.forEach((activity) => {
      const dateStr = activity.scheduled_at ?? activity.created_at;
      const key = formatDateKey(new Date(dateStr));
      const list = map.get(key) || [];
      list.push(activity);
      map.set(key, list);
    });
    return map;
  }, [data]);

  const days = useMemo(() => getMonthDays(year, month), [year, month]);

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };

  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  const createMutation = useMutation({
    mutationFn: (formData: ActivityFormData) => api.post('/activities', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setDialogOpen(false);
      reset();
    },
  });

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: { type: 'meeting', title: '', description: '', scheduled_at: '' },
  });

  const handleDayClick = (dateObj: Date, inMonth: boolean) => {
    if (!inMonth) return;
    const iso = dateObj.toISOString().substring(0, 16);
    setSelectedDate(iso);
    setValue('scheduled_at', iso);
    setDialogOpen(true);
  };

  const todayKey = formatDateKey(today);

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>Calendar</Typography>
        <Box display="flex" gap={1} alignItems="center">
          <Button size="small" startIcon={<TodayIcon />} onClick={goToday}>
            Today
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            New Event
          </Button>
        </Box>
      </Box>

      {/* Month navigation */}
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <IconButton onClick={prevMonth}><ChevronLeftIcon /></IconButton>
        <Typography variant="h6" fontWeight={600} sx={{ minWidth: 200, textAlign: 'center' }}>
          {MONTH_NAMES[month]} {year}
        </Typography>
        <IconButton onClick={nextMonth}><ChevronRightIcon /></IconButton>
      </Box>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      ) : (
        <Paper sx={{ p: 1 }}>
          {/* Day headers */}
          <Grid2 container>
            {DAYS.map((day) => (
              <Grid2 key={day} size={{ xs: 12 / 7 }}>
                <Box py={1} textAlign="center">
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    {day}
                  </Typography>
                </Box>
              </Grid2>
            ))}
          </Grid2>

          {/* Calendar grid */}
          <Grid2 container>
            {days.map((day, idx) => {
              const key = formatDateKey(day.dateObj);
              const dayActivities = activitiesByDate.get(key) ?? [];
              const isToday = key === todayKey;

              return (
                <Grid2 key={idx} size={{ xs: 12 / 7 }}>
                  <Paper
                    variant="outlined"
                    onClick={() => handleDayClick(day.dateObj, day.inMonth)}
                    sx={{
                      minHeight: 100,
                      p: 0.5,
                      cursor: day.inMonth ? 'pointer' : 'default',
                      opacity: day.inMonth ? 1 : 0.4,
                      bgcolor: isToday ? 'primary.50' : 'background.paper',
                      border: isToday ? 2 : 1,
                      borderColor: isToday ? 'primary.main' : 'divider',
                      '&:hover': day.inMonth ? { bgcolor: 'action.hover' } : {},
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={isToday ? 700 : 400}
                      color={isToday ? 'primary.main' : 'text.primary'}
                      sx={{ mb: 0.5 }}
                    >
                      {day.date}
                    </Typography>
                    {dayActivities.slice(0, 3).map((activity) => (
                      <Tooltip key={activity.id} title={`${activity.type}: ${activity.title}`}>
                        <Chip
                          label={activity.title}
                          size="small"
                          color={typeChipColors[activity.type] ?? 'default'}
                          variant="filled"
                          sx={{
                            width: '100%',
                            justifyContent: 'flex-start',
                            mb: 0.25,
                            height: 20,
                            fontSize: 11,
                            textDecoration: activity.is_completed ? 'line-through' : 'none',
                          }}
                        />
                      </Tooltip>
                    ))}
                    {dayActivities.length > 3 && (
                      <Typography variant="caption" color="text.secondary">
                        +{dayActivities.length - 3} more
                      </Typography>
                    )}
                  </Paper>
                </Grid2>
              );
            })}
          </Grid2>
        </Paper>
      )}

      {/* Add event dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Schedule Activity</DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="calendar-form"
            onSubmit={handleSubmit((d) => createMutation.mutateAsync(d))}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}
          >
            <Controller name="type" control={control} render={({ field }) => (
              <TextField {...field} label="Type" select fullWidth>
                {activityTypes.map((t) => (
                  <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t}</MenuItem>
                ))}
              </TextField>
            )} />
            <Controller name="title" control={control} render={({ field }) => (
              <TextField
                {...field}
                label="Title"
                fullWidth
                required
                error={!!errors.title}
                helperText={errors.title?.message}
              />
            )} />
            <Controller name="description" control={control} render={({ field }) => (
              <TextField {...field} label="Description" fullWidth multiline rows={3} />
            )} />
            <Controller name="scheduled_at" control={control} render={({ field }) => (
              <TextField
                {...field}
                label="Date & Time"
                fullWidth
                type="datetime-local"
                required
                slotProps={{ inputLabel: { shrink: true } }}
                error={!!errors.scheduled_at}
                helperText={errors.scheduled_at?.message}
              />
            )} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" type="submit" form="calendar-form" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
