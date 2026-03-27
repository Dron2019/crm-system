import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Switch,
  Tooltip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Divider,
  Alert,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useWorkflows,
  useCreateWorkflow,
  useUpdateWorkflow,
  useDeleteWorkflow,
  useToggleWorkflow,
  type Workflow,
  type WorkflowAction,
} from '@/hooks/useWorkflows';
import ConfirmDialog from '@/components/ConfirmDialog';

// ─── Constants ──────────────────────────────────────────────────────────────

const TRIGGER_TYPES = [
  { value: 'contact.created', label: 'Contact Created' },
  { value: 'contact.updated', label: 'Contact Updated' },
  { value: 'company.created', label: 'Company Created' },
  { value: 'company.updated', label: 'Company Updated' },
  { value: 'deal.created', label: 'Deal Created' },
  { value: 'deal.updated', label: 'Deal Updated' },
  { value: 'deal.won', label: 'Deal Won' },
  { value: 'deal.lost', label: 'Deal Lost' },
  { value: 'activity.created', label: 'Activity Created' },
  { value: 'activity.completed', label: 'Activity Completed' },
  { value: 'note.created', label: 'Note Created' },
];

const ACTION_TYPES = [
  { value: 'send_notification', label: 'Send Notification' },
  { value: 'create_activity', label: 'Create Activity' },
  { value: 'send_email', label: 'Send Email' },
  { value: 'update_field', label: 'Update Field' },
  { value: 'webhook', label: 'Call Webhook' },
];

const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'task', 'note'];

// ─── Schema ──────────────────────────────────────────────────────────────────

const actionSchema = z.object({
  type: z.enum(['send_email', 'update_field', 'create_activity', 'send_notification', 'webhook']),
  config: z.record(z.unknown()),
});

const workflowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().or(z.literal('')),
  trigger_type: z.string().min(1, 'Trigger is required'),
  is_active: z.boolean(),
  actions: z.array(actionSchema).min(1, 'At least one action is required'),
});

type WorkflowFormData = z.infer<typeof workflowSchema>;

const DEFAULT_ACTION: WorkflowAction = { type: 'send_notification', config: {} };

// ─── Action Config Editors ────────────────────────────────────────────────────

function ActionConfigEditor({
  actionType,
  config,
  onChange,
}: {
  actionType: string;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const field = (key: string) => ({
    value: (config[key] as string) ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...config, [key]: e.target.value }),
  });

  switch (actionType) {
    case 'send_notification':
      return (
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <TextField
            size="small"
            label="Title"
            fullWidth
            {...field('title')}
            placeholder="e.g. New deal created: {{deal.title}}"
          />
          <TextField
            size="small"
            label="Message (optional)"
            fullWidth
            multiline
            rows={2}
            {...field('body')}
            placeholder="e.g. {{contact.name}} just created a new deal worth {{deal.value}}"
          />
        </Stack>
      );

    case 'create_activity':
      return (
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <TextField
            size="small"
            label="Activity Type"
            select
            fullWidth
            value={(config.type as string) ?? 'task'}
            onChange={(e) => onChange({ ...config, type: e.target.value })}
          >
            {ACTIVITY_TYPES.map((t) => (
              <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>
                {t}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Title"
            fullWidth
            {...field('title')}
            placeholder="e.g. Follow up with {{contact.name}}"
          />
          <TextField
            size="small"
            label="Description (optional)"
            fullWidth
            multiline
            rows={2}
            {...field('description')}
          />
        </Stack>
      );

    case 'send_email':
      return (
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <TextField
            size="small"
            label="To (email)"
            fullWidth
            {...field('to')}
            placeholder="e.g. {{contact.email}} or team@company.com"
          />
          <TextField
            size="small"
            label="Subject"
            fullWidth
            {...field('subject')}
            placeholder="e.g. New deal: {{deal.title}}"
          />
          <TextField
            size="small"
            label="Body"
            fullWidth
            multiline
            rows={3}
            {...field('body')}
            placeholder="Email content with {{variable}} placeholders"
          />
        </Stack>
      );

    case 'update_field':
      return (
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <TextField
            size="small"
            label="Entity Type"
            select
            fullWidth
            value={(config.entity_type as string) ?? 'contact'}
            onChange={(e) => onChange({ ...config, entity_type: e.target.value })}
          >
            {['contact', 'company', 'deal'].map((t) => (
              <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>
                {t}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Field Name"
            fullWidth
            {...field('field')}
            placeholder="e.g. status"
          />
          <TextField
            size="small"
            label="Value"
            fullWidth
            {...field('value')}
            placeholder="e.g. customer"
          />
        </Stack>
      );

    case 'webhook':
      return (
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <TextField
            size="small"
            label="URL"
            fullWidth
            {...field('url')}
            placeholder="https://hooks.example.com/..."
          />
          <TextField
            size="small"
            label="Method"
            select
            fullWidth
            value={(config.method as string) ?? 'POST'}
            onChange={(e) => onChange({ ...config, method: e.target.value })}
          >
            {['POST', 'PUT', 'PATCH', 'GET'].map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      );

    default:
      return null;
  }
}

// ─── Workflow Dialog ──────────────────────────────────────────────────────────

function WorkflowDialog({
  open,
  editTarget,
  onClose,
}: {
  open: boolean;
  editTarget: Workflow | null;
  onClose: () => void;
}) {
  const isClone = editTarget?.id === 'clone';
  const isEdit = !!editTarget && !isClone;
  const createWf = useCreateWorkflow();
  const updateWf = useUpdateWorkflow(isEdit ? editTarget.id : '');

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<WorkflowFormData>({
    resolver: zodResolver(workflowSchema),
    defaultValues: editTarget
      ? {
          name: editTarget.name,
          description: editTarget.description ?? '',
          trigger_type: editTarget.trigger_type,
          is_active: editTarget.is_active,
          actions: editTarget.actions.length > 0 ? (editTarget.actions as WorkflowAction[]) : [DEFAULT_ACTION],
        }
      : {
          name: '',
          description: '',
          trigger_type: '',
          is_active: true,
          actions: [DEFAULT_ACTION],
        },
  });

  const { fields, append, remove, update } = useFieldArray({ control, name: 'actions' });

  // Reset form when editTarget changes (fixes empty form on edit)
  useEffect(() => {
    if (!editTarget) return;
    reset({
      name: editTarget.name,
      description: editTarget.description ?? '',
      trigger_type: editTarget.trigger_type,
      is_active: editTarget.is_active,
      actions: editTarget.actions.length > 0 ? (editTarget.actions as WorkflowAction[]) : [DEFAULT_ACTION],
    });
  }, [editTarget, reset]);

  const onSubmit = async (values: WorkflowFormData) => {
    const payload = {
      ...values,
      description: values.description || undefined,
    };

    if (isEdit) {
      await updateWf.mutateAsync(payload);
    } else {
      await createWf.mutateAsync(payload);
    }
    reset();
    onClose();
  };

  const isPending = createWf.isPending || updateWf.isPending;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{isEdit ? 'Edit Workflow' : editTarget ? 'Clone Workflow' : 'Create Workflow'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            {/* Basic info */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Workflow Name"
                fullWidth
                required
                size="small"
                {...register('name')}
                error={!!errors.name}
                helperText={errors.name?.message}
              />
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, whiteSpace: 'nowrap' }}>
                    <Switch checked={field.value} onChange={(_, v) => field.onChange(v)} />
                    <Typography variant="body2">{field.value ? 'Active' : 'Inactive'}</Typography>
                  </Box>
                )}
              />
            </Box>

            <TextField
              label="Description (optional)"
              fullWidth
              size="small"
              multiline
              rows={2}
              {...register('description')}
            />

            {/* Trigger */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Trigger
              </Typography>
              <Controller
                name="trigger_type"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    label="When this happens…"
                    fullWidth
                    size="small"
                    value={field.value}
                    onChange={field.onChange}
                    error={!!errors.trigger_type}
                    helperText={errors.trigger_type?.message}
                  >
                    {TRIGGER_TYPES.map((t) => (
                      <MenuItem key={t.value} value={t.value}>
                        {t.label}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Box>

            <Divider />

            {/* Actions */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="subtitle2">
                  Actions ({fields.length})
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  variant="outlined"
                  onClick={() => append({ ...DEFAULT_ACTION })}
                >
                  Add Action
                </Button>
              </Box>

              {errors.actions && (
                <Alert severity="error" sx={{ mb: 1 }}>
                  {typeof errors.actions.message === 'string' ? errors.actions.message : 'At least one action is required'}
                </Alert>
              )}

              <Stack spacing={2}>
                {fields.map((field, idx) => {
                  const currentAction = watch(`actions.${idx}`);
                  return (
                    <Card key={field.id} variant="outlined">
                      <CardContent sx={{ pb: '12px !important' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Chip
                            label={`Step ${idx + 1}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          <Controller
                            name={`actions.${idx}.type`}
                            control={control}
                            render={({ field: f }) => (
                              <TextField
                                select
                                size="small"
                                label="Action"
                                value={f.value}
                                onChange={(e) => {
                                  f.onChange(e.target.value);
                                  update(idx, { type: e.target.value as WorkflowAction['type'], config: {} });
                                }}
                                sx={{ minWidth: 200 }}
                              >
                                {ACTION_TYPES.map((a) => (
                                  <MenuItem key={a.value} value={a.value}>
                                    {a.label}
                                  </MenuItem>
                                ))}
                              </TextField>
                            )}
                          />
                          <Box sx={{ flexGrow: 1 }} />
                          {fields.length > 1 && (
                            <IconButton size="small" color="error" onClick={() => remove(idx)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>

                        <ActionConfigEditor
                          actionType={currentAction.type}
                          config={(currentAction.config as Record<string, unknown>) ?? {}}
                          onChange={(newConfig) =>
                            update(idx, { ...currentAction, config: newConfig })
                          }
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isPending}>
            {isEdit ? 'Save Changes' : 'Create Workflow'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkflowsPage() {
  const { data: workflows, isLoading } = useWorkflows();
  const deleteWf = useDeleteWorkflow();
  const toggleWf = useToggleWorkflow();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Workflow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Workflow | null>(null);

  const openCreate = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEdit = (wf: Workflow) => {
    setEditTarget(wf);
    setDialogOpen(true);
  };

  const handleCloneWorkflow = (wf: Workflow) => {
    setEditTarget({
      ...wf,
      id: 'clone',
      name: `${wf.name} (copy)`,
      is_active: false,
    });
    setDialogOpen(true);
  };

  const labelForTrigger = (triggerType: string) =>
    TRIGGER_TYPES.find((t) => t.value === triggerType)?.label ?? triggerType;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={500}>
            Workflow Automation
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Automate repetitive tasks with trigger-based workflows
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          New Workflow
        </Button>
      </Box>

      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {!isLoading && (!workflows || workflows.length === 0) ? (
        <Card>
          <CardContent sx={{ py: 8, textAlign: 'center' }}>
            <PlayArrowIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No workflows yet
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Automate your CRM by creating workflows that trigger on events like deal creation,
              contact updates, and more.
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              Create your first workflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Trigger</TableCell>
                <TableCell align="center">Actions</TableCell>
                <TableCell align="center">Runs</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="right">Controls</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(workflows ?? []).map((wf) => (
                <TableRow key={wf.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {wf.name}
                    </Typography>
                    {wf.description && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {wf.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={labelForTrigger(wf.trigger_type)}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {wf.actions.map((action, idx) => (
                        <Chip
                          key={idx}
                          label={ACTION_TYPES.find((a) => a.value === action.type)?.label ?? action.type}
                          size="small"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{wf.logs_count ?? 0}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={wf.is_active ? 'Active' : 'Inactive'}
                      color={wf.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={wf.is_active ? 'Deactivate' : 'Activate'}>
                      <Switch
                        size="small"
                        checked={wf.is_active}
                        onChange={() => toggleWf.mutate({ id: wf.id, is_active: !wf.is_active })}
                      />
                    </Tooltip>
                    <Tooltip title="Clone">
                      <IconButton size="small" onClick={() => handleCloneWorkflow(wf)}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEdit(wf)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => setDeleteTarget(wf)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <WorkflowDialog
        open={dialogOpen}
        editTarget={editTarget}
        onClose={() => {
          setDialogOpen(false);
          setEditTarget(null);
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Workflow"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteWf.mutateAsync(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
