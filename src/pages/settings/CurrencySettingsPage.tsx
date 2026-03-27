import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Currency } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { useCurrencyStore } from '@/stores/currencyStore';

function isOwner(user: ReturnType<typeof useAuthStore.getState>['user']) {
  if (!user) return false;
  return user.is_system_admin || user.current_team_role === 'owner';
}

interface CurrencyForm {
  code: string;
  name: string;
  symbol: string;
  rate: string;
}

const emptyForm: CurrencyForm = { code: '', name: '', symbol: '', rate: '1' };

export default function CurrencySettingsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const setCurrencies = useCurrencyStore((s) => s.setCurrencies);
  const owner = isOwner(user);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Currency | null>(null);
  const [form, setForm] = useState<CurrencyForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const [deleteTarget, setDeleteTarget] = useState<Currency | null>(null);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);

  const { data: currencies = [], isLoading } = useQuery<Currency[]>({
    queryKey: ['currencies'],
    queryFn: async () => {
      const { data } = await api.get('/currencies');
      return data.data ?? data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<CurrencyForm>) =>
      editing
        ? api.put(`/currencies/${editing.id}`, payload)
        : api.post('/currencies', payload),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      const updated = data.data ?? data;
      if (Array.isArray(updated)) {
        setCurrencies(updated);
      }
      closeDialog();
    },
    onError: (err: any) => {
      setFormErrors(err.response?.data?.errors ?? {});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/currencies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      setDeleteTarget(null);
    },
  });

  const refreshMutation = useMutation({
    mutationFn: () => api.post('/currencies/refresh-rates'),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      setRefreshMsg((data.data ?? data).message ?? 'Rates updated.');
      setTimeout(() => setRefreshMsg(null), 5000);
    },
    onError: (err: any) => {
      setRefreshMsg(err.response?.data?.message ?? 'Failed to refresh rates.');
      setTimeout(() => setRefreshMsg(null), 5000);
    },
  });

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setFormErrors({});
    setDialogOpen(true);
  }

  function openEdit(c: Currency) {
    setEditing(c);
    setForm({ code: c.code, name: c.name, symbol: c.symbol, rate: String(c.rate) });
    setFormErrors({});
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
  }

  function handleSave() {
    saveMutation.mutate({
      code: form.code.toUpperCase(),
      name: form.name,
      symbol: form.symbol,
      rate: form.rate,
    });
  }

  return (
    <Box maxWidth={860}>
      <Typography variant="h6" fontWeight={600} mb={0.5}>
        Currencies &amp; Exchange Rates
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Manage the currencies available in your workspace. All users can select a
        display currency in their profile settings.
      </Typography>

      {refreshMsg && (
        <Alert severity={refreshMsg.startsWith('Could') || refreshMsg.startsWith('Failed') ? 'error' : 'success'} sx={{ mb: 2 }}>
          {refreshMsg}
        </Alert>
      )}

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" px={2} py={1.5}>
            <Typography variant="subtitle2" fontWeight={600}>
              {currencies.length} currencies
            </Typography>
            {owner && (
              <Box display="flex" gap={1}>
                <Tooltip title="Fetch live rates from open.er-api.com">
                  <span>
                    <Button
                      size="small"
                      startIcon={refreshMutation.isPending ? <CircularProgress size={14} /> : <RefreshIcon />}
                      onClick={() => refreshMutation.mutate()}
                      disabled={refreshMutation.isPending}
                    >
                      Refresh Rates
                    </Button>
                  </span>
                </Tooltip>
                <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
                  Add Currency
                </Button>
              </Box>
            )}
          </Box>

          {isLoading ? (
            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Symbol</TableCell>
                  <TableCell align="right">Rate (1 USD =)</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {currencies.map((c) => (
                  <TableRow key={c.code} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" fontWeight={600}>{c.code}</Typography>
                        {c.code === 'USD' && <Chip label="base" size="small" variant="outlined" />}
                      </Box>
                    </TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.symbol}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontFamily="monospace">
                        {Number(c.rate).toFixed(4)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {owner && (
                        <Box display="flex" justifyContent="flex-end">
                          <IconButton size="small" onClick={() => openEdit(c)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          {c.code !== 'USD' && (
                            <IconButton size="small" color="error" onClick={() => setDeleteTarget(c)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="xs" fullWidth>
        <DialogTitle>{editing ? `Edit ${editing.code}` : 'Add Currency'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <TextField
              label="Code (ISO 4217)"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().slice(0, 3) }))}
              inputProps={{ maxLength: 3 }}
              disabled={!!editing}
              required
              fullWidth
              error={!!formErrors.code}
              helperText={formErrors.code?.[0]}
            />
            <TextField
              label="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              fullWidth
              error={!!formErrors.name}
              helperText={formErrors.name?.[0]}
            />
            <TextField
              label="Symbol"
              value={form.symbol}
              onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
              required
              fullWidth
              inputProps={{ maxLength: 10 }}
              error={!!formErrors.symbol}
              helperText={formErrors.symbol?.[0]}
            />
            <TextField
              label="Rate (1 USD = N)"
              value={form.rate}
              onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
              type="number"
              inputProps={{ step: 'any', min: '0.000001' }}
              required
              fullWidth
              error={!!formErrors.rate}
              helperText={formErrors.rate?.[0] ?? 'How many units of this currency equal 1 USD'}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs">
        <DialogTitle>Delete Currency</DialogTitle>
        <DialogContent>
          <Typography>
            Delete <strong>{deleteTarget?.name} ({deleteTarget?.code})</strong>? Existing deal values stored in
            this currency will not be converted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            disabled={deleteMutation.isPending}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
