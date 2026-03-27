import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useContacts } from '@/hooks/useContacts';
import type { Contact } from '@/types';
import type { CustomFieldDefinition } from '@/components/CustomFieldRenderer';

const statusColors: Record<string, 'default' | 'primary' | 'success' | 'warning'> = {
  active: 'primary',
  lead: 'warning',
  customer: 'success',
  inactive: 'default',
};

export default function ContactsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? '');
  const [sourceFilter, setSourceFilter] = useState(searchParams.get('source') ?? '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') ?? 'created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    (searchParams.get('direction') as 'asc' | 'desc') ?? 'desc',
  );
  const [page, setPage] = useState(Number(searchParams.get('page') ?? 0));
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const { data: customFields } = useQuery<CustomFieldDefinition[]>({
    queryKey: ['custom-fields', 'contact'],
    queryFn: async () => {
      const { data } = await api.get('/custom-fields', { params: { entity_type: 'contact' } });
      return data.data;
    },
  });

  const [customFilters, setCustomFilters] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key.startsWith('cf_')) {
        next[key.replace('cf_', '')] = value;
      }
    });
    return next;
  });

  const { data, isLoading } = useContacts({
    page: page + 1,
    per_page: rowsPerPage,
    search: search || undefined,
    status: statusFilter || undefined,
    sort: sortBy,
    direction: sortDirection,
  });

  const contacts = data?.data ?? [];
  const filteredContacts = useMemo(() => {
    return contacts.filter((contact: Contact) => {
      if (sourceFilter && (contact.source ?? '') !== sourceFilter) return false;
      for (const [field, expected] of Object.entries(customFilters)) {
        if (!expected) continue;
        const actual = contact.custom_fields?.[field];
        if (Array.isArray(actual)) {
          if (!actual.map(String).some((v) => v.toLowerCase().includes(expected.toLowerCase()))) {
            return false;
          }
        } else if (typeof actual === 'boolean') {
          const boolText = actual ? 'yes' : 'no';
          if (!boolText.includes(expected.toLowerCase())) return false;
        } else if (String(actual ?? '').toLowerCase().includes(expected.toLowerCase()) === false) {
          return false;
        }
      }
      return true;
    });
  }, [contacts, sourceFilter, customFilters]);

  const total = filteredContacts.length;

  useEffect(() => {
    const next = new URLSearchParams();
    if (search) next.set('search', search);
    if (statusFilter) next.set('status', statusFilter);
    if (sourceFilter) next.set('source', sourceFilter);
    if (sortBy) next.set('sort', sortBy);
    if (sortDirection) next.set('direction', sortDirection);
    if (page) next.set('page', String(page));
    Object.entries(customFilters).forEach(([key, value]) => {
      if (value) next.set(`cf_${key}`, value);
    });
    setSearchParams(next, { replace: true });
  }, [search, statusFilter, sourceFilter, sortBy, sortDirection, page, customFilters, setSearchParams]);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setSourceFilter('');
    setSortBy('created_at');
    setSortDirection('desc');
    setPage(0);
    setCustomFilters({});
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Contacts
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/contacts/new')}
        >
          Add Contact
        </Button>
      </Box>

      <Paper sx={{ mb: 2, p: 2 }}>
        <Box display="flex" gap={1} flexWrap="wrap">
          <TextField
            placeholder="Search contacts..."
            size="small"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
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
            label="Source"
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 140 }}
          />
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="lead">Lead</MenuItem>
            <MenuItem value="customer">Customer</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Sort"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="created_at">Created Date</MenuItem>
            <MenuItem value="first_name">First Name</MenuItem>
            <MenuItem value="last_name">Last Name</MenuItem>
            <MenuItem value="email">Email</MenuItem>
            <MenuItem value="status">Status</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Direction"
            value={sortDirection}
            onChange={(e) => {
              setSortDirection(e.target.value as 'asc' | 'desc');
              setPage(0);
            }}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="asc">Asc</MenuItem>
            <MenuItem value="desc">Desc</MenuItem>
          </TextField>
          <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={resetFilters}>
            Reset
          </Button>
        </Box>

        {customFields && customFields.length > 0 && (
          <Box display="flex" gap={1} mt={1} flexWrap="wrap">
            {customFields.map((field) => (
              <TextField
                key={field.id}
                size="small"
                label={field.label}
                value={customFilters[field.name] ?? ''}
                onChange={(e) => {
                  setCustomFilters((prev) => ({ ...prev, [field.name]: e.target.value }));
                  setPage(0);
                }}
                sx={{ minWidth: 180 }}
              />
            ))}
          </Box>
        )}
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Company</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Tags</TableCell>
              <TableCell width={100}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredContacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  No contacts found.
                </TableCell>
              </TableRow>
            ) : (
              filteredContacts.map((contact) => (
                <TableRow key={contact.id} hover sx={{ cursor: 'pointer' }}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
                        {contact.first_name.charAt(0)}
                        {contact.last_name?.charAt(0) ?? ''}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {contact.full_name}
                        </Typography>
                        {contact.job_title && (
                          <Typography variant="caption" color="text.secondary">
                            {contact.job_title}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{contact.email ?? '—'}</TableCell>
                  <TableCell>{contact.phone ?? '—'}</TableCell>
                  <TableCell>
                    {contact.companies?.[0]?.name ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={contact.status}
                      size="small"
                      color={statusColors[contact.status] ?? 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {contact.tags?.map((tag) => (
                        <Chip
                          key={tag.id}
                          label={tag.name}
                          size="small"
                          sx={{ bgcolor: `${tag.color}20`, color: tag.color, fontWeight: 600 }}
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => navigate(`/contacts/${contact.id}`)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => navigate(`/contacts/${contact.id}/edit`)}>
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
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>
    </Box>
  );
}
