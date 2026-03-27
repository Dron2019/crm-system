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
import { useCurrencyStore } from '@/stores/currencyStore';

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

function HorizontalBars({
  title,
  rows,
  valueFormatter = (n) => String(n),
}: {
  title: string;
  rows: Array<{ label: string; value: number }>;
  valueFormatter?: (n: number) => string;
}) {
  const maxValue = Math.max(...rows.map((r) => r.value), 1);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        {rows.length === 0 ? (
          <Typography color="text.secondary">No data yet</Typography>
        ) : (
          <Box display="flex" flexDirection="column" gap={1.25}>
            {rows.map((row) => {
              const pct = (row.value / maxValue) * 100;
              return (
                <Box key={row.label}>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {row.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {valueFormatter(row.value)}
                    </Typography>
                  </Box>
                  <Box sx={{ height: 10, bgcolor: 'action.hover', borderRadius: 999, overflow: 'hidden' }}>
                    <Box
                      sx={{
                        width: `${pct}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #0ea5e9 0%, #4f46e5 100%)',
                      }}
                    />
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function RevenueTrend({
  title,
  points,
}: {
  title: string;
  points: Array<{ label: string; value: number }>;
}) {
  const width = 680;
  const height = 220;
  const padding = 24;

  const values = points.map((p) => p.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);

  const xFor = (index: number) => {
    if (points.length <= 1) return padding;
    return padding + (index * (width - padding * 2)) / (points.length - 1);
  };

  const yFor = (value: number) => {
    const normalized = (value - min) / range;
    return height - padding - normalized * (height - padding * 2);
  };

  const polyline = points
    .map((p, i) => `${xFor(i)},${yFor(p.value)}`)
    .join(' ');

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        {points.length < 2 ? (
          <Typography color="text.secondary">Not enough data for trend</Typography>
        ) : (
          <Box>
            <Box sx={{ overflowX: 'auto' }}>
              <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#cbd5e1" />
                <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#cbd5e1" />
                <polyline
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={polyline}
                />
                {points.map((p, i) => (
                  <circle key={`${p.label}-${i}`} cx={xFor(i)} cy={yFor(p.value)} r="3.5" fill="#4f46e5" />
                ))}
              </svg>
            </Box>
            <Box display="flex" justifyContent="space-between" mt={0.5}>
              {points.map((p, i) => (
                <Typography key={`${p.label}-lbl-${i}`} variant="caption" color="text.secondary" sx={{ minWidth: 40 }}>
                  {p.label}
                </Typography>
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function OverviewTab() {
  const { data, isLoading } = useOverviewReport();
  const formatMoney = useCurrencyStore((s) => s.format);

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
            value={formatMoney(Number(data.deals.pipeline_value), 'USD')}
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
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 7 }}>
            <HorizontalBars
              title="Contacts by Status"
              rows={data.contacts.by_status.map((s) => ({ label: s.status, value: s.count }))}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Status Buckets
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {data.contacts.by_status.map((s) => (
                    <Chip key={s.status} label={`${s.status}: ${s.count}`} variant="outlined" />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
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
  const formatMoney = useCurrencyStore((s) => s.format);

  if (isLoading) return <LinearProgress />;
  if (!data) return null;

  return (
    <Box>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard title="Open Deals" value={data.totals.open.count} subtitle={formatMoney(Number(data.totals.open.value), 'USD')} icon={<TrendingUpIcon />} color="#4f46e5" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard title="Won Deals" value={data.totals.won.count} subtitle={formatMoney(Number(data.totals.won.value), 'USD')} icon={<AttachMoneyIcon />} color="#059669" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard title="Lost Deals" value={data.totals.lost.count} subtitle={formatMoney(Number(data.totals.lost.value), 'USD')} icon={<TrendingUpIcon />} color="#dc2626" />
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
                    <TableCell align="right">{formatMoney(Number(stage.total_value), 'USD')}</TableCell>
                    <TableCell align="right">{formatMoney(Number(stage.avg_value), 'USD')}</TableCell>
                    <TableCell align="right">{Math.round(stage.avg_probability)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Box mt={3}>
        <HorizontalBars
          title="Stage Value Distribution"
          rows={data.stages.map((stage) => ({
            label: stage.stage_name,
            value: Number(stage.total_value),
          }))}
          valueFormatter={(n) => formatMoney(Number(n), 'USD')}
        />
      </Box>
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
          <HorizontalBars
            title="Activity Mix by Type"
            rows={data.by_type.map((item) => ({ label: item.type, value: item.count }))}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <HorizontalBars
            title="Team Activity Output"
            rows={data.by_user.map((item) => ({ label: item.user_name, value: item.count }))}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} mt={0.5}>
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
  const formatMoney = useCurrencyStore((s) => s.format);

  if (isLoading) return <LinearProgress />;
  if (!data) return null;

  return (
    <Box>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard title="Total Revenue" value={formatMoney(Number(data.summary.total_revenue), 'USD')} subtitle={`${data.summary.deal_count} deals`} icon={<AttachMoneyIcon />} color="#059669" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard title="Avg Deal Size" value={formatMoney(Number(data.summary.avg_deal_size), 'USD')} icon={<TrendingUpIcon />} color="#4f46e5" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard title="Weighted Forecast" value={formatMoney(Number(data.forecast.weighted_value), 'USD')} subtitle={`${data.forecast.open_deals} open deals`} icon={<TrendingUpIcon />} color="#7c3aed" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard title="Total Pipeline" value={formatMoney(Number(data.forecast.total_pipeline), 'USD')} icon={<AttachMoneyIcon />} color="#0891b2" />
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
                    <TableCell align="right">{formatMoney(Number(item.revenue), 'USD')}</TableCell>
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

      <Box mt={3}>
        <RevenueTrend
          title="Revenue Trend (Draft)"
          points={data.monthly.map((item) => ({
            label: item.month,
            value: Number(item.revenue),
          }))}
        />
      </Box>
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
