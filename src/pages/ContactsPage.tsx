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
  Autocomplete,
  TablePagination,
  IconButton,
  Tooltip,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useContacts } from '@/hooks/useContacts';
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
  const [sortBy, setSortBy] = useState(searchParams.get('sort') ?? 'created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    (searchParams.get('direction') as 'asc' | 'desc') ?? 'desc',
  );
  const [page, setPage] = useState(Number(searchParams.get('page') ?? 0));
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filterOpen, setFilterOpen] = useState(false);

  const [fieldFilters, setFieldFilters] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key.startsWith('f_')) {
        next[key] = value;
      }
    });
    return next;
  });

  const [draftFieldFilters, setDraftFieldFilters] = useState<Record<string, string>>(fieldFilters);

  const { data: customFields } = useQuery<CustomFieldDefinition[]>({
    queryKey: ['custom-fields', 'contact'],
    queryFn: async () => {
      const { data } = await api.get('/custom-fields', { params: { entity_type: 'contact' } });
      return data.data;
    },
  });

  const [customFilters, setCustomFilters] = useState<Record<string, string | string[]>>(() => {
    const next: Record<string, string | string[]> = {};
    searchParams.forEach((value, key) => {
      if (key.startsWith('cf_')) {
        next[key.replace('cf_', '')] = value.includes('||') ? value.split('||').filter(Boolean) : value;
      }
    });
    return next;
  });

  const [draftCustomFilters, setDraftCustomFilters] = useState<Record<string, string | string[]>>(customFilters);

  const contactsParams = useMemo(() => {
    const params: Record<string, string | number | undefined> = {
      page: page + 1,
      per_page: rowsPerPage,
      search: search || undefined,
      sort: sortBy,
      direction: sortDirection,
    };

    Object.entries(fieldFilters).forEach(([key, value]) => {
      if (value) params[key] = value;
    });

    Object.entries(customFilters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length > 0) params[`cf_${key}`] = value.join('||');
        return;
      }
      if (value) params[`cf_${key}`] = value;
    });

    return params;
  }, [page, rowsPerPage, search, sortBy, sortDirection, fieldFilters, customFilters]);

  const { data, isLoading } = useContacts(contactsParams);

  const contacts = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  useEffect(() => {
    const next = new URLSearchParams();
    if (search) next.set('search', search);
    if (sortBy) next.set('sort', sortBy);
    if (sortDirection) next.set('direction', sortDirection);
    if (page) next.set('page', String(page));
    Object.entries(fieldFilters).forEach(([key, value]) => {
      if (value) next.set(key, value);
    });
    Object.entries(customFilters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length > 0) next.set(`cf_${key}`, value.join('||'));
        return;
      }
      if (value) next.set(`cf_${key}`, value);
    });
    setSearchParams(next, { replace: true });
  }, [search, sortBy, sortDirection, page, fieldFilters, customFilters, setSearchParams]);

  const resetFilters = () => {
    setSearch('');
    setSortBy('created_at');
    setSortDirection('desc');
    setPage(0);
    setFieldFilters({});
    setCustomFilters({});
    setDraftFieldFilters({});
    setDraftCustomFilters({});
  };

  const activeFilterCount = Object.values(fieldFilters).filter(Boolean).length
    + Object.values(customFilters).filter((v) => (Array.isArray(v) ? v.length > 0 : Boolean(v))).length;

  const filterFieldDefs = [
    { key: 'f_first_name', label: 'First Name' },
    { key: 'f_last_name', label: 'Last Name' },
    { key: 'f_email', label: 'Email' },
    { key: 'f_phone', label: 'Phone' },
    { key: 'f_mobile', label: 'Mobile' },
    { key: 'f_job_title', label: 'Job Title' },
    { key: 'f_avatar_url', label: 'Avatar URL' },
    { key: 'f_source', label: 'Source' },
    { key: 'f_status', label: 'Status' },
    { key: 'f_assigned_to', label: 'Assigned To User ID' },
    { key: 'f_last_contacted_at', label: 'Last Contacted At' },
    { key: 'f_created_at', label: 'Created At' },
  ];

  const renderCustomFilterField = (field: CustomFieldDefinition) => {
    const rawValue = draftCustomFilters[field.name];
    const value = Array.isArray(rawValue) ? rawValue : (rawValue ?? '');

    if (field.field_type === 'multiselect') {
      const selected = Array.isArray(rawValue)
        ? rawValue
        : typeof rawValue === 'string' && rawValue
          ? rawValue.split('||').filter(Boolean)
          : [];

      return (
        <Autocomplete
          key={field.id}
          multiple
          options={field.options ?? []}
          value={selected}
          onChange={(_, newValue) => {
            setDraftCustomFilters((prev) => ({ ...prev, [field.name]: newValue }));
          }}
          renderTags={(selectedValues, getTagProps) =>
            selectedValues.map((option, index) => (
              <Chip label={option} size="small" {...getTagProps({ index })} key={`${field.id}-${option}`} />
            ))
          }
          renderInput={(params) => (
            <TextField {...params} size="small" label={`${field.label} (Custom)`} />
          )}
        />
      );
    }

    if (field.field_type === 'select') {
      return (
        <TextField
          key={field.id}
          size="small"
          select
          label={`${field.label} (Custom)`}
          value={Array.isArray(value) ? '' : value}
          onChange={(e) => {
            setDraftCustomFilters((prev) => ({ ...prev, [field.name]: e.target.value }));
          }}
        >
          <MenuItem value="">Any</MenuItem>
          {(field.options ?? []).map((opt) => (
            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
          ))}
        </TextField>
      );
    }

    if (field.field_type === 'boolean') {
      return (
        <TextField
          key={field.id}
          size="small"
          select
          label={`${field.label} (Custom)`}
          value={value}
          onChange={(e) => {
            setDraftCustomFilters((prev) => ({ ...prev, [field.name]: e.target.value }));
          }}
        >
          <MenuItem value="">Any</MenuItem>
          <MenuItem value="yes">Yes</MenuItem>
          <MenuItem value="no">No</MenuItem>
        </TextField>
      );
    }

    if (field.field_type === 'date') {
      return (
        <TextField
          key={field.id}
          size="small"
          type="date"
          label={`${field.label} (Custom)`}
          value={value}
          onChange={(e) => {
            setDraftCustomFilters((prev) => ({ ...prev, [field.name]: e.target.value }));
          }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      );
    }

    return (
      <TextField
        key={field.id}
        size="small"
        type={field.field_type === 'number' || field.field_type === 'currency' ? 'number' : 'text'}
        label={`${field.label} (Custom)`}
        value={value}
        onChange={(e) => {
          setDraftCustomFilters((prev) => ({ ...prev, [field.name]: e.target.value }));
        }}
      />
    );
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
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => {
              setDraftFieldFilters(fieldFilters);
              setDraftCustomFilters(customFilters);
              setFilterOpen(true);
            }}
          >
            Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
          </Button>
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
            ) : contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  No contacts found.
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
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

      <Dialog open={filterOpen} onClose={() => setFilterOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Filter Contacts</DialogTitle>
        <DialogContent>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={1.5} mt={0.5}>
            {filterFieldDefs.map((field) => (
              <TextField
                key={field.key}
                size="small"
                label={field.label}
                value={draftFieldFilters[field.key] ?? ''}
                onChange={(e) => {
                  setDraftFieldFilters((prev) => ({ ...prev, [field.key]: e.target.value }));
                }}
              />
            ))}
            {customFields?.map((field) => renderCustomFilterField(field))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDraftFieldFilters({});
              setDraftCustomFilters({});
            }}
          >
            Clear Draft
          </Button>
          <Button onClick={() => setFilterOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              setFieldFilters(draftFieldFilters);
              setCustomFilters(draftCustomFilters);
              setPage(0);
              setFilterOpen(false);
            }}
          >
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
