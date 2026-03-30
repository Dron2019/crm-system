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
  Stack,
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
  const [templateLoading, setTemplateLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
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
    try {
      const { data } = await api.post('/apartments/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      addToast(data.message || 'Apartments import completed', data.skipped > 0 ? 'warning' : 'success');

      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      queryClient.invalidateQueries({ queryKey: ['chessboard'] });
    } catch (error: any) {
      addToast(error?.response?.data?.message || 'Apartments import failed', 'error');
    } finally {
      setImportLoading(false);
      event.target.value = '';
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
                  {importLoading ? 'Importing...' : 'Upload and Import'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={handleImportFile}
                />
              </Box>
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
