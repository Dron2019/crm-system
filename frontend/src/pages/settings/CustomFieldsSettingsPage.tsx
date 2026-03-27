import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  Switch,
  FormControlLabel,
  Select,
  OutlinedInput,
  Checkbox,
  ListItemText,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface CustomFieldDef {
  id: string;
  name: string;
  label: string;
  field_type: string;
  entity_type: string;
  options: string[] | null;
  required: boolean;
  display_order: number;
}

const fieldTypes = ['text', 'textarea', 'number', 'date', 'select', 'multiselect', 'boolean', 'currency', 'url', 'email'];
const entityTypes = ['contact', 'company', 'deal', 'team'];

export default function CustomFieldsSettingsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState('');
  const [form, setForm] = useState({
    name: '',
    label: '',
    field_type: 'text',
    entity_type: 'contact',
    entity_types: ['contact'] as string[],
    options: '',
    required: false,
  });

  const { data: fields, isLoading } = useQuery<CustomFieldDef[]>({
    queryKey: ['custom-fields'],
    queryFn: async () => {
      const { data } = await api.get('/custom-fields');
      return data.data;
    },
  });

  const filtered = entityFilter
    ? fields?.filter((f) => f.entity_type === entityFilter)
    : fields;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const basePayload = {
        name: form.name,
        label: form.label,
        field_type: form.field_type,
        required: form.required,
        options: form.options ? form.options.split(',').map((s) => s.trim()).filter(Boolean) : null,
      };

      const targets = form.entity_types?.length ? form.entity_types : [form.entity_type];

      if (editId) {
        const groupFields = (fields ?? []).filter((f) => f.name === (editGroupName ?? form.name));
        const existingByType = new Map(groupFields.map((f) => [f.entity_type, f]));

        const requests: Promise<unknown>[] = [];

        // Update all selected existing instances
        targets.forEach((entityType) => {
          const existing = existingByType.get(entityType);
          if (existing) {
            requests.push(
              api.put(`/custom-fields/${existing.id}`, {
                ...basePayload,
                entity_type: entityType,
              }),
            );
          }
        });

        // Create selected instances that do not exist yet
        targets
          .filter((entityType) => !existingByType.has(entityType))
          .forEach((entityType) => {
            requests.push(
              api.post('/custom-fields', {
                ...basePayload,
                entity_type: entityType,
              }),
            );
          });

        return Promise.all(requests);
      }

      return Promise.all(
        targets.map((entityType) =>
          api.post('/custom-fields', {
            ...basePayload,
            entity_type: entityType,
          }),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/custom-fields/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom-fields'] }),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditId(null);
    setEditGroupName(null);
    setForm({ name: '', label: '', field_type: 'text', entity_type: 'contact', entity_types: ['contact'], options: '', required: false });
  };

  const openEdit = (field: CustomFieldDef) => {
    const groupFields = (fields ?? []).filter((f) => f.name === field.name);
    setEditId(field.id);
    setEditGroupName(field.name);
    setForm({
      name: field.name,
      label: field.label,
      field_type: field.field_type,
      entity_type: field.entity_type,
      entity_types: groupFields.length > 0 ? groupFields.map((f) => f.entity_type) : [field.entity_type],
      options: field.options?.join(', ') ?? '',
      required: field.required,
    });
    setDialogOpen(true);
  };

  if (isLoading) {
    return <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={600}>Custom Fields</Typography>
        <Box display="flex" gap={1}>
          <TextField
            select
            size="small"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            sx={{ minWidth: 140 }}
            label="Entity"
          >
            <MenuItem value="">All</MenuItem>
            {entityTypes.map((t) => (
              <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t}</MenuItem>
            ))}
          </TextField>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            Add Field
          </Button>
        </Box>
      </Box>

      {filtered?.map((field) => (
        <Card key={field.id} sx={{ mb: 1 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box flex={1}>
              <Typography variant="body2" fontWeight={600}>{field.label}</Typography>
              <Box display="flex" gap={0.5} mt={0.5}>
                <Chip label={field.entity_type} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                <Chip label={field.field_type} size="small" variant="outlined" />
                {field.required && <Chip label="Required" size="small" color="warning" variant="outlined" />}
              </Box>
            </Box>
            <IconButton size="small" onClick={() => openEdit(field)}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={() => deleteMutation.mutate(field.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </CardContent>
        </Card>
      ))}

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Edit Custom Field' : 'Add Custom Field'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Label"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Field Name (key)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              fullWidth
              required
              helperText="Lowercase, no spaces (e.g., lead_source)"
            />
            <TextField
              select
              label="Field Type"
              value={form.field_type}
              onChange={(e) => setForm({ ...form, field_type: e.target.value })}
              fullWidth
            >
              {fieldTypes.map((t) => (
                <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t}</MenuItem>
              ))}
            </TextField>
            <Select
              multiple
              value={form.entity_types}
              onChange={(e) => setForm({ ...form, entity_types: e.target.value as string[] })}
              input={<OutlinedInput />}
              renderValue={(selected) => (selected as string[]).join(', ')}
              fullWidth
              size="small"
            >
              {entityTypes.map((t) => (
                <MenuItem key={t} value={t}>
                  <Checkbox checked={form.entity_types.indexOf(t) > -1} />
                  <ListItemText primary={t} sx={{ textTransform: 'capitalize' }} />
                </MenuItem>
              ))}
            </Select>
            {(form.field_type === 'select' || form.field_type === 'multiselect') && (
              <TextField
                label="Options (comma-separated)"
                value={form.options}
                onChange={(e) => setForm({ ...form, options: e.target.value })}
                fullWidth
                helperText="e.g., Option A, Option B, Option C"
              />
            )}
            <FormControlLabel
              control={<Switch checked={form.required} onChange={(e) => setForm({ ...form, required: e.target.checked })} />}
              label="Required"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !form.name || !form.label}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
