import { Typography, Grid2 as Grid, Card, CardContent, Box, List, ListItem, ListItemText, Chip, CircularProgress } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import HandshakeIcon from '@mui/icons-material/Handshake';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useContacts } from '@/hooks/useContacts';
import { useCompanies } from '@/hooks/useCompanies';
import { useDeals } from '@/hooks/useDeals';
import { useActivities } from '@/hooks/useActivities';

export default function DashboardPage() {
  const { data: contacts } = useContacts({ per_page: 1 });
  const { data: companies } = useCompanies({ per_page: 1 });
  const { data: deals } = useDeals({ per_page: 200, status: 'open' });
  const { data: recentActivities, isLoading: activitiesLoading } = useActivities({ per_page: 5, sort: 'created_at', direction: 'desc' });

  const totalContacts = contacts?.meta?.total ?? '—';
  const totalCompanies = companies?.meta?.total ?? '—';
  const openDeals = deals?.meta?.total ?? '—';
  const pipelineValue = deals?.data
    ? `$${(deals.data.reduce((sum, d) => sum + Number(d.value), 0) / 1000).toFixed(0)}K`
    : '—';

  const stats = [
    { label: 'Total Contacts', value: String(totalContacts), icon: <PeopleIcon />, color: '#6366f1' },
    { label: 'Companies', value: String(totalCompanies), icon: <BusinessIcon />, color: '#ec4899' },
    { label: 'Open Deals', value: String(openDeals), icon: <HandshakeIcon />, color: '#f59e0b' },
    { label: 'Pipeline Value', value: pipelineValue, icon: <TrendingUpIcon />, color: '#22c55e' },
  ];

  return (
    <Box>
      <Typography variant="h4" fontWeight={500} mb={3}>
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        {stats.map((stat) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.label}>
            <Card>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: `${stat.color}15`,
                    color: stat.color,
                    display: 'flex',
                  }}
                >
                  {stat.icon}
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {stat.label}
                  </Typography>
                  <Typography variant="h5" fontWeight={500}>
                    {stat.value}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" mb={2}>
            Recent Activity
          </Typography>
          {activitiesLoading ? (
            <Box display="flex" justifyContent="center" py={2}><CircularProgress size={24} /></Box>
          ) : recentActivities?.data && recentActivities.data.length > 0 ? (
            <List disablePadding>
              {recentActivities.data.map((activity) => (
                <ListItem key={activity.id} divider sx={{ px: 0 }}>
                  <ListItemText
                    primary={activity.title}
                    secondary={new Date(activity.created_at).toLocaleString()}
                    primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }}
                  />
                  <Chip
                    label={activity.type}
                    size="small"
                    variant="outlined"
                    sx={{ textTransform: 'capitalize' }}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Activity feed will appear here once you start adding contacts and deals.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
