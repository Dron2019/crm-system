import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Chip,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AssignmentIcon from '@mui/icons-material/Assignment';
import {
  useOverviewReport,
  usePipelineReport,
  useActivityReport,
  useRevenueReport,
} from '@/hooks/useReports';

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography color="text.secondary" variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" sx={{ my: 1, fontWeight: 700 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography color="text.secondary" variant="caption">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              bgcolor: color,
              borderRadius: 2,
              p: 1,
              display: 'flex',
              color: 'white',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function OverviewTab() {
  const { data, isLoading } = useOverviewReport();

  if (isLoading) return <LinearProgress />;
  if (!data) return null;

  return (
    <Box>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="Total Contacts"
            value={data.contacts.total}
            subtitle={`+${data.contacts.new_this_month} this month`}
            icon={<PeopleIcon />}
            color="#4f46e5"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="Companies"
            value={data.companies.total}
            subtitle={`+${data.companies.new_this_month} this month`}
            icon={<BusinessIcon />}
            color="#0891b2"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="Pipeline Value"
            value={`$${Number(data.deals.pipeline_value).toLocaleString()}`}
            subtitle={`${data.deals.open} open deals`}
            icon={<AttachMoneyIcon />}
            color="#059669"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="Activities"
            value={data.activities.total_this_month}
            subtitle={`${data.activities.overdue} overdue`}
            icon={<AssignmentIcon />}
            color="#d97706"
          />
        </Grid>
      </Grid>

      {data.contacts.by_status.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Contacts by Status
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {data.contacts.by_status.map((s) => (
                <Chip
                  key={s.status}
                  label={`${s.status}: ${s.count}`}
                  variant="outlined"
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Deals Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 4 }}>
              <Typography variant="body2" color="text.secondary">Total Deals</Typography>
              <Typography variant="h5">{data.deals.total}</Typography>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Typography variant="body2" color="text.secondary">Open Deals</Typography>
              <Typography variant="h5">{data.deals.open}</Typography>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Typography variant="body2" color="text.secondary">Won This Month</Typography>
              <Typography variant="h5" color="success.main">{data.deals.won_this_month}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}

function PipelineTab() {
  const { data, isLoading } = usePipelineReport();

  if (isLoading) return <LinearProgress />;
  if (!data) return null;

  return (
    <Box>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard title="Open Deals" value={data.totals.open.count} subtitle={`$${Number(data.totals.open.value).toLocaleString()}`} icon={<TrendingUpIcon />} color="#4f46e5" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard title="Won Deals" value={data.totals.won.count} subtitle={`$${Number(data.totals.won.value).toLocaleString()}`} icon={<AttachMoneyIcon />} color="#059669" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard title="Lost Deals" value={data.totals.lost.count} subtitle={`$${Number(data.totals.lost.value).toLocaleString()}`} icon={<TrendingUpIcon />} color="#dc2626" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard title="Win Rate" value={`${data.totals.win_rate}%`} icon={<TrendingUpIcon />} color="#7c3aed" />
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Pipeline Breakdown by Stage
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Stage</TableCell>
                  <TableCell align="right">Deals</TableCell>
                  <TableCell align="right">Total Value</TableCell>
                  <TableCell align="right">Avg Value</TableCell>
                  <TableCell align="right">Avg Probability</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.stages.map((stage) => (
                  <TableRow key={stage.stage_id}>
                    <TableCell>{stage.stage_name}</TableCell>
                    <TableCell align="right">{stage.deal_count}</TableCell>
                    <TableCell align="right">${Number(stage.total_value).toLocaleString()}</TableCell>
                    <TableCell align="right">${Number(stage.avg_value).toLocaleString()}</TableCell>
                    <TableCell align="right">{Math.round(stage.avg_probability)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}

function ActivityTab() {
  const { data, isLoading } = useActivityReport();

  if (isLoading) return <LinearProgress />;
  if (!data) return null;

  return (
    <Box>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard title="Total Activities" value={data.completion.total} icon={<AssignmentIcon />} color="#4f46e5" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard title="Completed" value={data.completion.completed} icon={<AssignmentIcon />} color="#059669" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard title="Overdue" value={data.completion.overdue} icon={<AssignmentIcon />} color="#dc2626" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard title="Completion Rate" value={`${data.completion.completion_rate}%`} icon={<TrendingUpIcon />} color="#7c3aed" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                By Type
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Count</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.by_type.map((item) => (
                      <TableRow key={item.type}>
                        <TableCell sx={{ textTransform: 'capitalize' }}>{item.type}</TableCell>
                        <TableCell align="right">{item.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                By Team Member
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Member</TableCell>
                      <TableCell align="right">Activities</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.by_user.map((item) => (
                      <TableRow key={item.user_id}>
                        <TableCell>{item.user_name}</TableCell>
                        <TableCell align="right">{item.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

function RevenueTab() {
  const { data, isLoading } = useRevenueReport();

  if (isLoading) return <LinearProgress />;
  if (!data) return null;

  return (
    <Box>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard title="Total Revenue" value={`$${Number(data.summary.total_revenue).toLocaleString()}`} subtitle={`${data.summary.deal_count} deals`} icon={<AttachMoneyIcon />} color="#059669" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard title="Avg Deal Size" value={`$${Number(data.summary.avg_deal_size).toLocaleString()}`} icon={<TrendingUpIcon />} color="#4f46e5" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard title="Weighted Forecast" value={`$${Number(data.forecast.weighted_value).toLocaleString()}`} subtitle={`${data.forecast.open_deals} open deals`} icon={<TrendingUpIcon />} color="#7c3aed" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard title="Total Pipeline" value={`$${Number(data.forecast.total_pipeline).toLocaleString()}`} icon={<AttachMoneyIcon />} color="#0891b2" />
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Monthly Revenue
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Month</TableCell>
                  <TableCell align="right">Deals Won</TableCell>
                  <TableCell align="right">Revenue</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.monthly.map((item) => (
                  <TableRow key={item.month}>
                    <TableCell>{item.month}</TableCell>
                    <TableCell align="right">{item.deal_count}</TableCell>
                    <TableCell align="right">${Number(item.revenue).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {data.monthly.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      <Typography color="text.secondary" sx={{ py: 2 }}>
                        No revenue data yet
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}

export default function ReportsPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        Reports & Analytics
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Overview" />
          <Tab label="Pipeline" />
          <Tab label="Activities" />
          <Tab label="Revenue" />
        </Tabs>
      </Box>

      {tab === 0 && <OverviewTab />}
      {tab === 1 && <PipelineTab />}
      {tab === 2 && <ActivityTab />}
      {tab === 3 && <RevenueTab />}
    </Box>
  );
}
