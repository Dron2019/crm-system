 import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';

interface ProjectOption {
  id: string;
  name: string;
}

interface BuildingOption {
  id: string;
  name: string;
  project_id?: string;
  project_name?: string;
}

interface SectionOption {
  id: string;
  name: string;
  building_id: string;
}

interface StatusOption {
  id: string;
  name: string;
}

interface ApartmentImportPreviewRowFields {
  building_id: string | null;
  section_id: string | null;
  status_id: string | null;
  building_name_raw?: string | null;
  section_name_raw?: string | null;
  status_name_raw?: string | null;
  number: string | null;
  floor: number | null;
  rooms: number;
  area: number;
  price: number;
  layout_type?: string | null;
  has_balcony: boolean;
  has_terrace: boolean;
  has_loggia: boolean;
  balcony_area?: number | null;
  ceiling_height?: number | null;
}

interface ApartmentImportPreviewRow {
  row_number: number;
  fields: ApartmentImportPreviewRowFields;
  errors: string[];
}

interface ApartmentImportExportDialogProps {
  projectId?: string;
  buildingId?: string;
  triggerLabel?: string;
  size?: 'small' | 'medium';
}

const exportFieldOptions = [
  { key: 'project_name', label: 'Project name' },
  { key: 'building_name', label: 'Building name' },
  { key: 'section_name', label: 'Section name' },
  { key: 'number', label: 'Apartment number' },
  { key: 'floor', label: 'Floor' },
  { key: 'rooms', label: 'Rooms' },
  { key: 'area', label: 'Area' },
  { key: 'price', label: 'Price' },
  { key: 'status_name', label: 'Status' },
  { key: 'layout_type', label: 'Layout type' },
  { key: 'has_balcony', label: 'Has balcony' },
  { key: 'has_terrace', label: 'Has terrace' },
  { key: 'has_loggia', label: 'Has loggia' },
  { key: 'balcony_area', label: 'Balcony area' },
  { key: 'ceiling_height', label: 'Ceiling height' },
] as const;

export default function ApartmentImportExportDialog({
  projectId,
  buildingId,
  triggerLabel = 'Import / Export Apartments',
  size = 'small',
}: ApartmentImportExportDialogProps) {
  const addToast = useToastStore((s) => s.addToast);
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [importLoading, setImportLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importPreviewRows, setImportPreviewRows] = useState<ApartmentImportPreviewRow[]>([]);
  const [importBuildings, setImportBuildings] = useState<BuildingOption[]>([]);
  const [importSections, setImportSections] = useState<SectionOption[]>([]);
  const [importStatuses, setImportStatuses] = useState<StatusOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId ?? '');
  const [selectedBuildingId, setSelectedBuildingId] = useState(buildingId ?? '');
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'project_name',
    'building_name',
    'number',
    'floor',
    'rooms',
    'area',
    'price',
    'status_name',
  ]);

  const { data: projectsData } = useQuery({
    queryKey: ['objects-projects-for-export'],
    queryFn: async () => {
      const response = await api.get('/projects');
      return response.data.data as ProjectOption[];
    },
    enabled: open && !projectId,
  });

  const { data: buildingsData, isLoading: buildingsLoading } = useQuery({
    queryKey: ['objects-buildings-for-export', selectedProjectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${selectedProjectId}/buildings`);
      return response.data.data as BuildingOption[];
    },
    enabled: open && !!selectedProjectId,
  });

  const projects = useMemo(() => projectsData ?? [], [projectsData]);
  const buildings = useMemo(() => buildingsData ?? [], [buildingsData]);
  const rowsWithErrors = useMemo(
    () => importPreviewRows.filter((row) => row.errors.length > 0).length,
    [importPreviewRows],
  );

  const getSectionsForBuilding = (rowBuildingId: string | null | undefined) => {
    if (!rowBuildingId) {
      return [];
    }

    return importSections.filter((section) => section.building_id === rowBuildingId);
  };

  const updateImportRow = (rowNumber: number, changes: Partial<ApartmentImportPreviewRowFields>) => {
    setImportPreviewRows((prev) => prev.map((row) => {
      if (row.row_number !== rowNumber) {
        return row;
      }

      const nextFields = { ...row.fields, ...changes };
      if (Object.prototype.hasOwnProperty.call(changes, 'building_id')) {
        const nextBuildingId = changes.building_id ?? null;
        const sectionsForBuilding = getSectionsForBuilding(nextBuildingId);
        if (!sectionsForBuilding.some((section) => section.id === nextFields.section_id)) {
          nextFields.section_id = null;
        }
      }

      return {
        ...row,
        fields: nextFields,
        errors: [],
      };
    }));
  };

  const downloadBlob = (data: BlobPart, fallbackFileName: string, contentDisposition?: string) => {
    const blob = new Blob([data], { type: 'text/csv' });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;

    const fileNameFromHeader = contentDisposition?.match(/filename="?([^";]+)"?/i)?.[1];
    link.download = fileNameFromHeader || fallbackFileName;

    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  };

  const handleTemplateDownload = async () => {
    setTemplateLoading(true);
    try {
      const response = await api.get('/apartments/import-template', {
        responseType: 'blob',
      });
      downloadBlob(
        response.data,
        'apartments-import-template.csv',
        response.headers['content-disposition'],
      );
      addToast('Template downloaded', 'success');
    } catch {
      addToast('Failed to download template', 'error');
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setImportLoading(true);
    setPreviewLoading(true);
    try {
      const { data } = await api.post('/apartments/import-preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const rows = (data.rows ?? []) as ApartmentImportPreviewRow[];
      setImportPreviewRows(rows);
      setImportBuildings((data.options?.buildings ?? []) as BuildingOption[]);
      setImportSections((data.options?.sections ?? []) as SectionOption[]);
      setImportStatuses((data.options?.statuses ?? []) as StatusOption[]);
      setImportFileName(file.name);

      const errorsCount = rows.reduce((acc, row) => acc + (row.errors?.length ?? 0), 0);
      addToast(
        errorsCount > 0
          ? 'Preview loaded. Fix highlighted rows, then commit import.'
          : 'Preview loaded. You can commit import.',
        errorsCount > 0 ? 'warning' : 'success',
      );
    } catch (error: any) {
      addToast(error?.response?.data?.message || 'Apartments import failed', 'error');
    } finally {
      setImportLoading(false);
      setPreviewLoading(false);
      event.target.value = '';
    }
  };

  const handleCommitImport = async () => {
    setCommitLoading(true);
    try {
      const payloadRows = importPreviewRows.map((row) => ({
        row_number: row.row_number,
        fields: row.fields,
        errors: row.errors,
      }));

      const { data } = await api.post('/apartments/import-commit', {
        rows: payloadRows,
      });

      addToast(data.message || 'Apartments import completed', data.skipped > 0 ? 'warning' : 'success');
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        addToast(data.errors.slice(0, 6).join(' | '), 'warning');
      }

      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      queryClient.invalidateQueries({ queryKey: ['chessboard'] });

      setImportPreviewRows([]);
      setImportBuildings([]);
      setImportSections([]);
      setImportStatuses([]);
      setImportFileName('');
      setOpen(false);
    } catch (error: any) {
      addToast(error?.response?.data?.message || 'Apartments import commit failed', 'error');
    } finally {
      setCommitLoading(false);
    }
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      addToast('Select at least one export field', 'warning');
      return;
    }

    setExportLoading(true);
    try {
      const response = await api.post(
        '/apartments/export',
        {
          fields: selectedFields,
          ...(selectedProjectId ? { project_id: selectedProjectId } : {}),
          ...(selectedBuildingId ? { building_id: selectedBuildingId } : {}),
        },
        { responseType: 'blob' },
      );

      downloadBlob(
        response.data,
        `apartments-${new Date().toISOString().slice(0, 10)}.csv`,
        response.headers['content-disposition'],
      );

      addToast('Apartments export generated', 'success');
    } catch (error: any) {
      addToast(error?.response?.data?.message || 'Apartments export failed', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        size={size}
        startIcon={<ImportExportIcon />}
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Apartments Import / Export</DialogTitle>
        <DialogContent dividers>
          <Tabs value={activeTab} onChange={(_, next) => setActiveTab(next)} sx={{ mb: 2 }}>
            <Tab label="Import" />
            <Tab label="Export" />
          </Tabs>

          {activeTab === 0 && (
            <Stack spacing={2}>
              <Alert severity="info">
                Supported formats: CSV, TXT, XLSX, XLS. Use template to match expected columns.
              </Alert>

              <Box display="flex" gap={1} flexWrap="wrap">
                <Button
                  variant="outlined"
                  startIcon={templateLoading ? <CircularProgress size={16} /> : <DownloadIcon />}
                  onClick={handleTemplateDownload}
                  disabled={templateLoading}
                >
                  Download Template
                </Button>
                <Button
                  variant="contained"
                  startIcon={importLoading ? <CircularProgress size={16} /> : <UploadFileIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importLoading}
                >
                  {importLoading ? 'Loading Preview...' : 'Upload and Preview'}
                </Button>
                {importPreviewRows.length > 0 && (
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setImportPreviewRows([]);
                      setImportBuildings([]);
                      setImportSections([]);
                      setImportStatuses([]);
                      setImportFileName('');
                    }}
                    disabled={commitLoading}
                  >
                    Reset Preview
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={handleImportFile}
                />
              </Box>

              {previewLoading && (
                <Box display="flex" justifyContent="center" py={2}>
                  <CircularProgress size={24} />
                </Box>
              )}

              {importPreviewRows.length > 0 && (
                <>
                  <Alert severity={rowsWithErrors > 0 ? 'warning' : 'success'}>
                    {rowsWithErrors > 0
                      ? `${rowsWithErrors} row(s) have unresolved values. Select valid building/section/status and fix fields.`
                      : 'All rows look valid. You can commit import.'}
                    {importFileName ? ` File: ${importFileName}` : ''}
                  </Alert>

                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Row</TableCell>
                          <TableCell>Building</TableCell>
                          <TableCell>Section</TableCell>
                          <TableCell>Apartment</TableCell>
                          <TableCell>Floor</TableCell>
                          <TableCell>Rooms</TableCell>
                          <TableCell>Area</TableCell>
                          <TableCell>Price</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Errors</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {importPreviewRows.map((row) => {
                          const rowSections = getSectionsForBuilding(row.fields.building_id);
                          return (
                            <TableRow key={row.row_number}>
                              <TableCell>{row.row_number}</TableCell>
                              <TableCell sx={{ minWidth: 210 }}>
                                <TextField
                                  select
                                  size="small"
                                  value={row.fields.building_id ?? ''}
                                  onChange={(e) => updateImportRow(row.row_number, { building_id: e.target.value || null })}
                                  fullWidth
                                  helperText={row.fields.building_name_raw ? `From file: ${row.fields.building_name_raw}` : undefined}
                                >
                                  <MenuItem value="">Select building</MenuItem>
                                  {importBuildings.map((building) => (
                                    <MenuItem key={building.id} value={building.id}>
                                      {building.name}{building.project_name ? ` (${building.project_name})` : ''}
                                    </MenuItem>
                                  ))}
                                </TextField>
                              </TableCell>
                              <TableCell sx={{ minWidth: 190 }}>
                                <TextField
                                  select
                                  size="small"
                                  value={row.fields.section_id ?? ''}
                                  onChange={(e) => updateImportRow(row.row_number, { section_id: e.target.value || null })}
                                  fullWidth
                                  helperText={row.fields.section_name_raw ? `From file: ${row.fields.section_name_raw}` : undefined}
                                >
                                  <MenuItem value="">Main / None</MenuItem>
                                  {rowSections.map((section) => (
                                    <MenuItem key={section.id} value={section.id}>{section.name}</MenuItem>
                                  ))}
                                </TextField>
                              </TableCell>
                              <TableCell sx={{ minWidth: 130 }}>
                                <TextField
                                  size="small"
                                  value={row.fields.number ?? ''}
                                  onChange={(e) => updateImportRow(row.row_number, { number: e.target.value || null })}
                                  fullWidth
                                />
                              </TableCell>
                              <TableCell sx={{ minWidth: 90 }}>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={row.fields.floor ?? ''}
                                  onChange={(e) => updateImportRow(row.row_number, { floor: e.target.value === '' ? null : Number(e.target.value) })}
                                  fullWidth
                                />
                              </TableCell>
                              <TableCell sx={{ minWidth: 90 }}>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={row.fields.rooms ?? ''}
                                  onChange={(e) => updateImportRow(row.row_number, { rooms: Number(e.target.value || 0) })}
                                  fullWidth
                                />
                              </TableCell>
                              <TableCell sx={{ minWidth: 100 }}>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={row.fields.area ?? ''}
                                  onChange={(e) => updateImportRow(row.row_number, { area: Number(e.target.value || 0) })}
                                  fullWidth
                                />
                              </TableCell>
                              <TableCell sx={{ minWidth: 110 }}>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={row.fields.price ?? ''}
                                  onChange={(e) => updateImportRow(row.row_number, { price: Number(e.target.value || 0) })}
                                  fullWidth
                                />
                              </TableCell>
                              <TableCell sx={{ minWidth: 190 }}>
                                <TextField
                                  select
                                  size="small"
                                  value={row.fields.status_id ?? ''}
                                  onChange={(e) => updateImportRow(row.row_number, { status_id: e.target.value || null })}
                                  fullWidth
                                  helperText={row.fields.status_name_raw ? `From file: ${row.fields.status_name_raw}` : undefined}
                                >
                                  <MenuItem value="">No status</MenuItem>
                                  {importStatuses.map((status) => (
                                    <MenuItem key={status.id} value={status.id}>{status.name}</MenuItem>
                                  ))}
                                </TextField>
                              </TableCell>
                              <TableCell sx={{ minWidth: 260 }}>
                                {row.errors.length > 0 ? (
                                  <Typography variant="caption" color="error.main">
                                    {row.errors.join(' | ')}
                                  </Typography>
                                ) : (
                                  <Typography variant="caption" color="success.main">OK</Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </Stack>
          )}

          {activeTab === 1 && (
            <Stack spacing={2}>
              <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
                {projectId ? (
                  <TextField
                    size="small"
                    label="Project"
                    value={selectedProjectId}
                    InputProps={{ readOnly: true }}
                  />
                ) : (
                  <TextField
                    select
                    size="small"
                    label="Project"
                    value={selectedProjectId}
                    onChange={(e) => {
                      setSelectedProjectId(e.target.value);
                      setSelectedBuildingId('');
                    }}
                  >
                    <MenuItem value="">All projects</MenuItem>
                    {projects.map((project) => (
                      <MenuItem key={project.id} value={project.id}>
                        {project.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}

                <TextField
                  select
                  size="small"
                  label="Building"
                  value={selectedBuildingId}
                  onChange={(e) => setSelectedBuildingId(e.target.value)}
                  disabled={!selectedProjectId || buildingsLoading}
                >
                  <MenuItem value="">All buildings</MenuItem>
                  {buildings.map((building) => (
                    <MenuItem key={building.id} value={building.id}>
                      {building.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              <Box>
                <Typography variant="subtitle2" mb={1}>
                  Export Fields
                </Typography>
                <FormGroup row>
                  {exportFieldOptions.map((option) => (
                    <FormControlLabel
                      key={option.key}
                      control={
                        <Checkbox
                          checked={selectedFields.includes(option.key)}
                          onChange={(e) => {
                            setSelectedFields((prev) => {
                              if (e.target.checked) {
                                return [...prev, option.key];
                              }

                              return prev.filter((field) => field !== option.key);
                            });
                          }}
                        />
                      }
                      label={option.label}
                    />
                  ))}
                </FormGroup>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
          {activeTab === 0 && importPreviewRows.length > 0 && (
            <Button
              variant="contained"
              startIcon={commitLoading ? <CircularProgress size={16} /> : <UploadFileIcon />}
              onClick={handleCommitImport}
              disabled={commitLoading}
            >
              {commitLoading ? 'Committing...' : 'Commit Import'}
            </Button>
          )}
          {activeTab === 1 && (
            <Button
              variant="contained"
              startIcon={exportLoading ? <CircularProgress size={16} /> : <FileDownloadIcon />}
              onClick={handleExport}
              disabled={exportLoading}
            >
              {exportLoading ? 'Exporting...' : 'Export CSV'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
