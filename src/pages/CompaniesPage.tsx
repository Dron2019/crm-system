import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  TablePagination,
  IconButton,
  Tooltip,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import BusinessIcon from '@mui/icons-material/Business';
import { useCompanies } from '@/hooks/useCompanies';
import { useCurrencyStore } from '@/stores/currencyStore';

export default function CompaniesPage() {
  const navigate = useNavigate();
  const formatMoneyCompact = useCurrencyStore((s) => s.formatCompact);
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const { data, isLoading } = useCompanies({
    page: page + 1,
    per_page: rowsPerPage,
    search: search || undefined,
    industry: industryFilter || undefined,
    sort: sortBy,
    direction: sortDirection,
  });

  const companies = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  const formatRevenue = (revenue: string | null) => {
    if (!revenue) return '—';
    return formatMoneyCompact(Number(revenue), 'USD');
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={500}>
          Companies
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/companies/new')}>
          Add Company
        </Button>
      </Box>

      <Paper sx={{ mb: 2, p: 2 }}>
        <Box display="flex" gap={1} flexWrap="wrap">
          <TextField
            placeholder="Search companies..."
            size="small"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 240 }}
          />
          <TextField
            size="small"
            label="Industry"
            value={industryFilter}
            onChange={(e) => { setIndustryFilter(e.target.value); setPage(0); }}
            sx={{ minWidth: 180 }}
          />
          <TextField
            select
            size="small"
            label="Sort"
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(0); }}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="created_at">Created Date</MenuItem>
            <MenuItem value="name">Name</MenuItem>
            <MenuItem value="industry">Industry</MenuItem>
            <MenuItem value="size">Size</MenuItem>
            <MenuItem value="annual_revenue">Revenue</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Direction"
            value={sortDirection}
            onChange={(e) => { setSortDirection(e.target.value as 'asc' | 'desc'); setPage(0); }}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="asc">Asc</MenuItem>
            <MenuItem value="desc">Desc</MenuItem>
          </TextField>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Company</TableCell>
              <TableCell>Industry</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Revenue</TableCell>
              <TableCell>Domain</TableCell>
              <TableCell>Contacts</TableCell>
              <TableCell width={100}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>Loading...</TableCell>
              </TableRow>
            ) : companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>No companies found.</TableCell>
              </TableRow>
            ) : (
              companies.map((company) => (
                <TableRow key={company.id} hover sx={{ cursor: 'pointer' }}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: 14 }}>
                        <BusinessIcon fontSize="small" />
                      </Avatar>
                      <Typography variant="body2" fontWeight={600}>{company.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{company.industry ?? '—'}</TableCell>
                  <TableCell>{company.size ?? '—'}</TableCell>
                  <TableCell>{formatRevenue(company.annual_revenue)}</TableCell>
                  <TableCell>{company.domain ?? '—'}</TableCell>
                  <TableCell>
                    <Chip label={company.contacts?.length ?? 0} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => navigate(`/companies/${company.id}`)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => navigate(`/companies/${company.id}/edit`)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        />
      </TableContainer>
    </Box>
  );
}
