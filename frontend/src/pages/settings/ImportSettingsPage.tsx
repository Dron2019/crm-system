import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';

type ImportPreviewPipeline = {
  id: string;
  name: string;
  stages: Array<{ id: string; name: string }>;
};

type ImportPreviewContact = {
  id: string;
  email: string;
  full_name: string;
};

type ImportPreviewCompany = {
  id: string;
  name: string;
};

type ImportPreviewRowFields = {
  title: string;
  value: string | number;
  currency: string;
  status: string;
  probability: string | number;
  expected_close_date: string | null;
  pipeline_id: string | null;
  stage_id: string | null;
  contact_id: string | null;
  company_id: string | null;
};

type ImportPreviewRow = {
  row_number: number;
  fields: ImportPreviewRowFields;
  errors: string[];
};

function isAdminRole(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'admin';
}

export default function ImportSettingsPage() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const user = useAuthStore((s) => s.user);

  const contactsInputRef = useRef<HTMLInputElement | null>(null);
  const dealsInputRef = useRef<HTMLInputElement | null>(null);

  const [contactsImportLoading, setContactsImportLoading] = useState(false);
  const [dealsPreviewLoading, setDealsPreviewLoading] = useState(false);
  const [dealsCommitLoading, setDealsCommitLoading] = useState(false);

  const [importPreviewRows, setImportPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [importPipelines, setImportPipelines] = useState<ImportPreviewPipeline[]>([]);
  const [importContacts, setImportContacts] = useState<ImportPreviewContact[]>([]);
  const [importCompanies, setImportCompanies] = useState<ImportPreviewCompany[]>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFileName, setImportFileName] = useState('');

  const canManageImports = isAdminRole(user?.current_team_role);

  const getPipelineStages = (pipelineId: string | null) => {
    if (!pipelineId) return [];
    return importPipelines.find((p) => p.id === pipelineId)?.stages ?? [];
  };

  const updateImportRow = (rowNumber: number, changes: Partial<ImportPreviewRowFields>) => {
    setImportPreviewRows((prev) =>
      prev.map((row) => {
        if (row.row_number !== rowNumber) return row;

        const nextFields = { ...row.fields, ...changes };
        if (changes.pipeline_id && changes.pipeline_id !== row.fields.pipeline_id) {
          const stages = getPipelineStages(changes.pipeline_id);
          if (!stages.some((stage) => stage.id === nextFields.stage_id)) {
            nextFields.stage_id = null;
          }
        }

        return {
          ...row,
          fields: nextFields,
          errors: [],
        };
      }),
    );
  };

  const handleTemplateDownload = async (url: string, filename: string) => {
    try {
      const response = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      addToast('Failed to download template.', 'error');
    }
  };

  const handleContactsImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setContactsImportLoading(true);
      const { data } = await api.post('/contacts/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      addToast(data.message || 'Contacts import completed.', 'success');
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Contacts import failed.';
      addToast(message, 'error');
    } finally {
      setContactsImportLoading(false);
      event.target.value = '';
    }
  };

  const handleDealsImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setDealsPreviewLoading(true);
      const { data } = await api.post('/deals/import-preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setImportPreviewRows(data.rows ?? []);
      setImportPipelines(data.options?.pipelines ?? []);
      setImportContacts(data.options?.contacts ?? []);
      setImportCompanies(data.options?.companies ?? []);
      setImportDialogOpen(true);
      setImportFileName(file.name);

      const errorsCount = (data.rows ?? []).reduce((acc: number, row: ImportPreviewRow) => acc + (row.errors?.length ?? 0), 0);
      addToast(
        errorsCount > 0
          ? 'Preview loaded. Fix highlighted rows before import.'
          : 'Preview loaded. You can review and confirm import.',
        errorsCount > 0 ? 'warning' : 'success',
      );
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Deals import failed.';
      addToast(message, 'error');
    } finally {
      setDealsPreviewLoading(false);
      event.target.value = '';
    }
  };

  const handleCommitImport = async () => {
    setDealsCommitLoading(true);
    try {
      const payloadRows = importPreviewRows.map((row) => ({
        row_number: row.row_number,
        fields: row.fields,
        errors: row.errors,
      }));

      const { data } = await api.post('/deals/import-commit', { rows: payloadRows });
      addToast(data.message || 'Deals import completed.', data.skipped > 0 ? 'warning' : 'success');

      if (Array.isArray(data.errors) && data.errors.length > 0) {
        addToast(data.errors.slice(0, 6).join(' | '), 'warning');
      }

      queryClient.invalidateQueries({ queryKey: ['deals'] });
      setImportDialogOpen(false);
      setImportPreviewRows([]);
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Deals import commit failed.';
      addToast(message, 'error');
    } finally {
      setDealsCommitLoading(false);
    }
  };

  const rowsWithErrors = useMemo(
    () => importPreviewRows.filter((row) => row.errors.length > 0).length,
    [importPreviewRows],
  );

  if (!canManageImports) {
    return <Navigate to="/settings" replace />;
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={2}>Imports</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Importing contacts and deals is restricted to team owner/admin.
      </Typography>

      <Box display="grid" gap={2} sx={{ gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>Contacts Import</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Download template and import contacts from CSV/XLSX.
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => handleTemplateDownload('/contacts/import-template', 'contacts-import-template.csv')}
              >
                Contacts Template
              </Button>
              <Button
                variant="contained"
                startIcon={<UploadFileIcon />}
                onClick={() => contactsInputRef.current?.click()}
                disabled={contactsImportLoading}
              >
                {contactsImportLoading ? 'Importing...' : 'Import Contacts'}
              </Button>
              <input
                ref={contactsInputRef}
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleContactsImportFile}
              />
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>Deals Import</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Preview and edit import rows before committing deals.
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => handleTemplateDownload('/deals/import-template', 'deals-import-template.csv')}
              >
                Deals Template
              </Button>
              <Button
                variant="contained"
                startIcon={<UploadFileIcon />}
                onClick={() => dealsInputRef.current?.click()}
                disabled={dealsPreviewLoading}
              >
                {dealsPreviewLoading ? 'Loading Preview...' : 'Import Deals'}
              </Button>
              <input
                ref={dealsInputRef}
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleDealsImportFile}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Dialog
        open={importDialogOpen}
        onClose={() => !dealsCommitLoading && setImportDialogOpen(false)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>Deals Import Preview: {importFileName || 'File'}</DialogTitle>
        <DialogContent dividers>
          <Alert severity={rowsWithErrors > 0 ? 'warning' : 'success'} sx={{ mb: 2 }}>
            {rowsWithErrors > 0
              ? `${rowsWithErrors} row(s) still have errors. Select existing pipeline, stage, company, and contact values.`
              : 'All rows are valid. You can confirm import.'}
          </Alert>

          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 480 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Row</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Pipeline</TableCell>
                  <TableCell>Stage</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Errors</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {importPreviewRows.map((row) => {
                  const stagesForRow = getPipelineStages(row.fields.pipeline_id);
                  return (
                    <TableRow key={row.row_number}>
                      <TableCell>{row.row_number}</TableCell>
                      <TableCell sx={{ minWidth: 180 }}>
                        <TextField
                          size="small"
                          value={row.fields.title ?? ''}
                          onChange={(e) => updateImportRow(row.row_number, { title: e.target.value })}
                        />
                      </TableCell>
                      <TableCell sx={{ minWidth: 180 }}>
                        <TextField
                          select
                          size="small"
                          value={row.fields.pipeline_id ?? ''}
                          onChange={(e) => updateImportRow(row.row_number, { pipeline_id: e.target.value || null })}
                        >
                          <MenuItem value="">Select pipeline</MenuItem>
                          {importPipelines.map((pipelineOption) => (
                            <MenuItem key={pipelineOption.id} value={pipelineOption.id}>
                              {pipelineOption.name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell sx={{ minWidth: 180 }}>
                        <TextField
                          select
                          size="small"
                          value={row.fields.stage_id ?? ''}
                          onChange={(e) => updateImportRow(row.row_number, { stage_id: e.target.value || null })}
                        >
                          <MenuItem value="">Select stage</MenuItem>
                          {stagesForRow.map((stageOption) => (
                            <MenuItem key={stageOption.id} value={stageOption.id}>
                              {stageOption.name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell sx={{ minWidth: 180 }}>
                        <TextField
                          select
                          size="small"
                          value={row.fields.company_id ?? ''}
                          onChange={(e) => updateImportRow(row.row_number, { company_id: e.target.value || null })}
                        >
                          <MenuItem value="">No company</MenuItem>
                          {importCompanies.map((company) => (
                            <MenuItem key={company.id} value={company.id}>
                              {company.name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell sx={{ minWidth: 220 }}>
                        <TextField
                          select
                          size="small"
                          value={row.fields.contact_id ?? ''}
                          onChange={(e) => updateImportRow(row.row_number, { contact_id: e.target.value || null })}
                        >
                          <MenuItem value="">No contact</MenuItem>
                          {importContacts.map((contact) => (
                            <MenuItem key={contact.id} value={contact.id}>
                              {contact.full_name ? `${contact.full_name} (${contact.email})` : contact.email}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell sx={{ minWidth: 140 }}>
                        <TextField
                          size="small"
                          value={row.fields.value ?? ''}
                          onChange={(e) => updateImportRow(row.row_number, { value: e.target.value })}
                        />
                      </TableCell>
                      <TableCell sx={{ minWidth: 120 }}>
                        <TextField
                          select
                          size="small"
                          value={row.fields.status ?? 'open'}
                          onChange={(e) => updateImportRow(row.row_number, { status: e.target.value })}
                        >
                          <MenuItem value="open">open</MenuItem>
                          <MenuItem value="won">won</MenuItem>
                          <MenuItem value="lost">lost</MenuItem>
                        </TextField>
                      </TableCell>
                      <TableCell sx={{ minWidth: 260 }}>
                        {row.errors.length > 0 ? (
                          <Box>
                            {row.errors.map((error) => (
                              <Typography key={error} variant="caption" color="error" display="block">
                                {error}
                              </Typography>
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="caption" color="success.main">OK</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {importPreviewRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Typography color="text.secondary">No rows found in file.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Divider sx={{ mt: 2 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)} disabled={dealsCommitLoading}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCommitImport}
            disabled={dealsCommitLoading || importPreviewRows.length === 0}
          >
            {dealsCommitLoading ? 'Importing...' : 'Confirm Import'}
          </Button>
        </DialogActions>
      </Dialog>

      {(contactsImportLoading || dealsPreviewLoading) && (
        <Box mt={2} display="flex" alignItems="center" gap={1}>
          <CircularProgress size={18} />
          <Typography variant="caption" color="text.secondary">Processing import...</Typography>
        </Box>
      )}
    </Box>
  );
}
