import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  IconButton,
  Tooltip,
  Alert,
  Divider,
  LinearProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import LockIcon from '@mui/icons-material/Lock';
import { useAuthStore } from '@/stores/authStore';
import {
  useTeamRoles,
  useCreateTeamRole,
  useUpdateTeamRole,
  useDeleteTeamRole,
  type TeamRole,
} from '@/hooks/useTeamMembers';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToastStore } from '@/stores/toastStore';

// --- Permission definitions ---
interface PermSection {
  label: string;
  key: string;
  actions: { key: string; label: string }[];
}

const PERMISSION_SECTIONS: PermSection[] = [
  {
    label: 'Contacts',
    key: 'contacts',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'update', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
      { key: 'export', label: 'Export' },
      { key: 'import', label: 'Import' },
    ],
  },
  {
    label: 'Companies',
    key: 'companies',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'update', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
      { key: 'export', label: 'Export' },
    ],
  },
  {
    label: 'Deals',
    key: 'deals',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'update', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
      { key: 'export', label: 'Export' },
      { key: 'import', label: 'Import' },
    ],
  },
  {
    label: 'Pipelines',
    key: 'pipelines',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'update', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
    ],
  },
  {
    label: 'Activities',
    key: 'activities',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'update', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
    ],
  },
  {
    label: 'Notes',
    key: 'notes',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'update', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
    ],
  },
  {
    label: 'Tags',
    key: 'tags',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'update', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
    ],
  },
  {
    label: 'Reports',
    key: 'reports',
    actions: [{ key: 'view', label: 'View' }],
  },
  {
    label: 'Custom Fields',
    key: 'custom_fields',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'update', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
    ],
  },
  {
    label: 'Team',
    key: 'team',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'update', label: 'Edit Settings' },
      { key: 'members.invite', label: 'Invite Members' },
      { key: 'members.remove', label: 'Remove Members' },
      { key: 'members.update_role', label: 'Change Roles' },
    ],
  },
];

const PRESET_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

function perm(section: string, action: string) {
  return `${section}.${action}`;
}

function buildDefaultPermissions(sections: PermSection[]): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  sections.forEach((s) => s.actions.forEach((a) => { map[perm(s.key, a.key)] = false; }));
  return map;
}

function permissionsToMap(perms: string[], sections: PermSection[]): Record<string, boolean> {
  const map = buildDefaultPermissions(sections);
  if (perms.includes('*')) {
    Object.keys(map).forEach((k) => { map[k] = true; });
    return map;
  }
  perms.forEach((p) => { if (p in map) map[p] = true; });
  return map;
}

function mapToPermissions(map: Record<string, boolean>): string[] {
  return Object.entries(map).filter(([, v]) => v).map(([k]) => k);
}

// --- Subcomponent: Role card ---
interface RoleCardProps {
  role: TeamRole;
  selected: boolean;
  onClick: () => void;
}

function RoleCard({ role, selected, onClick }: RoleCardProps) {
  return (
    <Box
      onClick={onClick}
      sx={{
        p: 1.5,
        borderRadius: 1.5,
        border: '2px solid',
        borderColor: selected ? role.color || '#6366f1' : 'divider',
        cursor: role.is_builtin ? 'default' : 'pointer',
        bgcolor: selected ? `${role.color}15` : 'background.paper',
        transition: 'all 0.15s',
        '&:hover': { borderColor: role.color || '#6366f1' },
      }}
    >
      <Box display="flex" alignItems="center" gap={1}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: role.color || '#6366f1', flexShrink: 0 }} />
        <Typography variant="body2" fontWeight={600} flex={1}>{role.name}</Typography>
        {role.is_builtin && <LockIcon sx={{ fontSize: 14, color: 'text.disabled' }} />}
      </Box>
      {role.description && (
        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>{role.description}</Typography>
      )}
      <Box mt={0.75}>
        <Chip label={`${role.permissions.includes('*') ? 'All' : role.permissions.length} permissions`} size="small" sx={{ bgcolor: `${role.color}20`, color: role.color, fontWeight: 600 }} />
      </Box>
    </Box>
  );
}

// --- Main page ---
export default function RolesSettingsPage() {
  const user = useAuthStore((s) => s.user);
  const addToast = useToastStore((s) => s.addToast);
  const canManage = user?.current_team_role === 'owner' || user?.current_team_role === 'admin';

  const { data: rolesData, isLoading } = useTeamRoles();
  const customRoles = rolesData?.data ?? [];
  const builtinRoles = rolesData?.builtin ?? [];
  const allRoles = [...builtinRoles, ...customRoles];

  const createRole = useCreateTeamRole();
  const updateRole = useUpdateTeamRole();
  const deleteRole = useDeleteTeamRole();

  const [selectedRole, setSelectedRole] = useState<TeamRole | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<TeamRole | null>(null);
  const [form, setForm] = useState({ name: '', description: '', color: PRESET_COLORS[0] });
  const [permMap, setPermMap] = useState<Record<string, boolean>>(buildDefaultPermissions(PERMISSION_SECTIONS));
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; role?: TeamRole }>({ open: false });

  const openCreate = () => {
    setEditingRole(null);
    setForm({ name: '', description: '', color: PRESET_COLORS[0] });
    setPermMap(buildDefaultPermissions(PERMISSION_SECTIONS));
    setEditorOpen(true);
  };

  const openEdit = (role: TeamRole) => {
    setEditingRole(role);
    setForm({ name: role.name, description: role.description ?? '', color: role.color });
    setPermMap(permissionsToMap(role.permissions, PERMISSION_SECTIONS));
    setEditorOpen(true);
  };

  const handleSave = () => {
    const permissions = mapToPermissions(permMap);
    if (editingRole) {
      updateRole.mutate(
        { id: editingRole.id, ...form, permissions },
        {
          onSuccess: () => { addToast('Role updated', 'success'); setEditorOpen(false); },
          onError: () => addToast('Failed to update role', 'error'),
        },
      );
    } else {
      createRole.mutate(
        { ...form, permissions },
        {
          onSuccess: () => { addToast('Role created', 'success'); setEditorOpen(false); },
          onError: () => addToast('Failed to create role', 'error'),
        },
      );
    }
  };

  const handleDelete = () => {
    if (!deleteConfirm.role) return;
    deleteRole.mutate(deleteConfirm.role.id, {
      onSuccess: () => { addToast('Role deleted', 'success'); setDeleteConfirm({ open: false }); setSelectedRole(null); },
      onError: () => addToast('Failed to delete role', 'error'),
    });
  };

  const togglePerm = (key: string) => {
    setPermMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSection = (section: PermSection) => {
    const keys = section.actions.map((a) => perm(section.key, a.key));
    const allOn = keys.every((k) => permMap[k]);
    setPermMap((prev) => {
      const next = { ...prev };
      keys.forEach((k) => { next[k] = !allOn; });
      return next;
    });
  };

  const viewRole = selectedRole ?? (allRoles.length > 0 ? allRoles[0] : null);

  if (isLoading) return <LinearProgress />;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={500}>Roles & Permissions</Typography>
        {canManage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            New Role
          </Button>
        )}
      </Box>

      {!canManage && (
        <Alert severity="info" sx={{ mb: 2 }}>Only owner/admin can manage roles.</Alert>
      )}

      <Box display="flex" gap={2} sx={{ flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Left: role list */}
        <Box sx={{ minWidth: 220, width: { md: 220 }, flexShrink: 0 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>
            BUILT-IN ROLES
          </Typography>
          <Box display="flex" flexDirection="column" gap={1} mb={2}>
            {builtinRoles.map((role) => (
              <RoleCard key={role.id} role={role} selected={viewRole?.id === role.id} onClick={() => setSelectedRole(role)} />
            ))}
          </Box>

          {customRoles.length > 0 && (
            <>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>
                CUSTOM ROLES
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                {customRoles.map((role) => (
                  <RoleCard key={role.id} role={role} selected={viewRole?.id === role.id} onClick={() => setSelectedRole(role)} />
                ))}
              </Box>
            </>
          )}

          {customRoles.length === 0 && canManage && (
            <Typography variant="caption" color="text.secondary">No custom roles yet. Create one to grant fine-grained access.</Typography>
          )}
        </Box>

        {/* Right: permission matrix for selected role */}
        {viewRole && (
          <Paper sx={{ flex: 1, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Box px={2} pt={2} pb={1} display="flex" alignItems="center" gap={1.5}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: viewRole.color }} />
              <Typography variant="h6" fontWeight={500} flex={1}>{viewRole.name}</Typography>
              {viewRole.is_builtin && <Chip label="Built-in" size="small" />}
              {!viewRole.is_builtin && canManage && (
                <Box display="flex" gap={0.5}>
                  <Tooltip title="Edit role">
                    <IconButton size="small" onClick={() => openEdit(viewRole)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete role">
                    <IconButton size="small" color="error" onClick={() => setDeleteConfirm({ open: true, role: viewRole })}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </Box>
            {viewRole.description && (
              <Typography variant="body2" color="text.secondary" px={2} pb={1}>{viewRole.description}</Typography>
            )}
            <Divider />

            {viewRole.permissions.includes('*') ? (
              <Box p={2}>
                <Chip label="Full access — all permissions granted" color="success" />
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, width: 160 }}>Section</TableCell>
                      {['View', 'Create', 'Edit', 'Delete', 'Export', 'Import', 'Other'].map((a) => (
                        <TableCell key={a} align="center" sx={{ fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>{a}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {PERMISSION_SECTIONS.map((section) => {
                      const actionMap = Object.fromEntries(section.actions.map((a) => [a.label, perm(section.key, a.key)]));
                      return (
                        <TableRow key={section.key} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{section.label}</Typography>
                          </TableCell>
                          {['View', 'Create', 'Edit', 'Delete', 'Export', 'Import'].map((label) => {
                            const permKey = actionMap[label];
                            if (!permKey) return <TableCell key={label} />;
                            const granted = viewRole.permissions.includes(permKey);
                            return (
                              <TableCell key={label} align="center">
                                {granted ? (
                                  <CheckBoxIcon sx={{ fontSize: 18, color: viewRole.color || '#6366f1' }} />
                                ) : (
                                  <CheckBoxOutlineBlankIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                                )}
                              </TableCell>
                            );
                          })}
                          {/* Other column for non-standard actions */}
                          <TableCell align="center">
                            {section.actions
                              .filter((a) => !['View', 'Create', 'Edit', 'Delete', 'Export', 'Import'].includes(a.label))
                              .map((a) => {
                                const k = perm(section.key, a.key);
                                const granted = viewRole.permissions.includes(k);
                                return (
                                  <Tooltip key={k} title={a.label}>
                                    <Box component="span">
                                      {granted ? (
                                        <CheckBoxIcon sx={{ fontSize: 18, color: viewRole.color || '#6366f1' }} />
                                      ) : (
                                        <CheckBoxOutlineBlankIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                                      )}
                                    </Box>
                                  </Tooltip>
                                );
                              })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        )}
      </Box>

      {/* Create / Edit Role Dialog */}
      <Dialog open={editorOpen} onClose={() => setEditorOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
        <DialogContent>
          <Box display="flex" gap={2} mt={1} mb={2} flexWrap="wrap">
            <TextField
              label="Role Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              sx={{ flex: 1, minWidth: 200 }}
            />
            <TextField
              label="Description (optional)"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              sx={{ flex: 2, minWidth: 200 }}
            />
          </Box>
          <Box mb={2}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.75}>COLOR</Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {PRESET_COLORS.map((c) => (
                <Box
                  key={c}
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    bgcolor: c,
                    cursor: 'pointer',
                    border: form.color === c ? '3px solid #1e293b' : '3px solid transparent',
                    transition: 'border 0.1s',
                  }}
                />
              ))}
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />
          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>PERMISSIONS</Typography>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: 150 }}>Section</TableCell>
                  {['View', 'Create', 'Edit', 'Delete', 'Export', 'Import', 'Other'].map((a) => (
                    <TableCell key={a} align="center" sx={{ fontWeight: 600, fontSize: 11 }}>{a}</TableCell>
                  ))}
                  <TableCell align="center" sx={{ fontWeight: 600, fontSize: 11 }}>All</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {PERMISSION_SECTIONS.map((section) => {
                  const actionMap = Object.fromEntries(section.actions.map((a) => [a.label, perm(section.key, a.key)]));
                  const sectionKeys = section.actions.map((a) => perm(section.key, a.key));
                  const allOn = sectionKeys.every((k) => permMap[k]);
                  return (
                    <TableRow key={section.key}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{section.label}</Typography>
                      </TableCell>
                      {['View', 'Create', 'Edit', 'Delete', 'Export', 'Import'].map((label) => {
                        const permKey = actionMap[label];
                        if (!permKey) return <TableCell key={label} />;
                        return (
                          <TableCell key={label} align="center" padding="checkbox">
                            <Checkbox
                              size="small"
                              checked={!!permMap[permKey]}
                              onChange={() => togglePerm(permKey)}
                              sx={{ color: form.color, '&.Mui-checked': { color: form.color } }}
                            />
                          </TableCell>
                        );
                      })}
                      {/* Other column */}
                      <TableCell align="center">
                        {section.actions
                          .filter((a) => !['View', 'Create', 'Edit', 'Delete', 'Export', 'Import'].includes(a.label))
                          .map((a) => {
                            const k = perm(section.key, a.key);
                            return (
                              <Tooltip key={k} title={a.label}>
                                <Checkbox
                                  size="small"
                                  checked={!!permMap[k]}
                                  onChange={() => togglePerm(k)}
                                  sx={{ color: form.color, '&.Mui-checked': { color: form.color } }}
                                />
                              </Tooltip>
                            );
                          })}
                      </TableCell>
                      <TableCell align="center" padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={allOn}
                          indeterminate={sectionKeys.some((k) => permMap[k]) && !allOn}
                          onChange={() => toggleSection(section)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditorOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!form.name || createRole.isPending || updateRole.isPending}
          >
            {editingRole ? 'Save Changes' : 'Create Role'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm.open}
        title={`Delete "${deleteConfirm.role?.name}"`}
        message="Members assigned to this role will be reset to 'member'. This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ open: false })}
      />
    </Box>
  );
}
