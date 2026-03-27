import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Chip,
  Paper,
} from '@mui/material';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import DataTable, { type Column } from '@/components/DataTable';
import type { AuditLog } from '@/types';

const actionColors: Record<string, 'primary' | 'success' | 'error' | 'warning' | 'info'> = {
  created: 'success',
  updated: 'info',
  deleted: 'error',
  restored: 'warning',
};

const auditableTypes = [
  'Contact',
  'Company',
  'Deal',
  'Activity',
  'Note',
  'Pipeline',
  'Tag',
];

const actionTypes = ['created', 'updated', 'deleted', 'restored'];

const columns: Column<AuditLog>[] = [
  {
    id: 'created_at',
    label: 'Date',
    sortable: true,
    width: 180,
    render: (row) => (
      <Typography variant="body2">
        {new Date(row.created_at).toLocaleString()}
      </Typography>
    ),
  },
  {
    id: 'user',
    label: 'User',
    width: 160,
    render: (row) => (
      <Typography variant="body2">
        {row.user?.name ?? 'System'}
      </Typography>
    ),
  },
  {
    id: 'action',
    label: 'Action',
    width: 120,
    render: (row) => (
      <Chip
        label={row.action}
        size="small"
        color={actionColors[row.action] ?? 'default'}
        variant="outlined"
        sx={{ textTransform: 'capitalize' }}
      />
    ),
  },
  {
    id: 'auditable_type',
    label: 'Entity',
    width: 120,
    render: (row) => (
      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
        {row.auditable_type.replace('App\\Models\\', '')}
      </Typography>
    ),
  },
  {
    id: 'auditable_id',
    label: 'Entity ID',
    width: 120,
    render: (row) => (
      <Typography variant="body2" fontFamily="monospace" fontSize={12}>
        {row.auditable_id.substring(0, 8)}…
      </Typography>
    ),
  },
  {
    id: 'changes',
    label: 'Changes',
    render: (row) => {
      if (!row.old_values && !row.new_values) return '—';
      const changedFields = Object.keys(row.new_values ?? row.old_values ?? {});
      return (
        <Box display="flex" gap={0.5} flexWrap="wrap">
          {changedFields.slice(0, 3).map((field) => (
            <Chip key={field} label={field} size="small" variant="outlined" sx={{ fontSize: 11 }} />
          ))}
          {changedFields.length > 3 && (
            <Chip label={`+${changedFields.length - 3}`} size="small" variant="outlined" sx={{ fontSize: 11 }} />
          )}
        </Box>
      );
    },
  },
];

export default function AuditLogPage() {
  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const { data, isLoading } = useAuditLogs({
    page: page + 1,
    per_page: 25,
    auditable_type: typeFilter || undefined,
    action: actionFilter || undefined,
  });

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Audit Log
      </Typography>

      <Paper sx={{ mb: 2, p: 2, display: 'flex', gap: 2 }}>
        <TextField
          select
          size="small"
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
          sx={{ minWidth: 160 }}
          label="Entity Type"
        >
          <MenuItem value="">All Types</MenuItem>
          {auditableTypes.map((t) => (
            <MenuItem key={t} value={t}>{t}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
          sx={{ minWidth: 140 }}
          label="Action"
        >
          <MenuItem value="">All Actions</MenuItem>
          {actionTypes.map((a) => (
            <MenuItem key={a} value={a} sx={{ textTransform: 'capitalize' }}>{a}</MenuItem>
          ))}
        </TextField>
      </Paper>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        total={data?.meta?.total ?? 0}
        page={page}
        rowsPerPage={25}
        loading={isLoading}
        emptyMessage="No audit log entries found."
        onPageChange={setPage}
      />
    </Box>
  );
}
