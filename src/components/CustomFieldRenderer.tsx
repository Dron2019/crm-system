import {
  TextField,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Autocomplete,
  Chip,
  InputAdornment,
  Button,
  Box,
  Typography,
  CircularProgress,
  Link,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DownloadIcon from '@mui/icons-material/Download';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { useState, useRef } from 'react';
import api from '@/lib/api';

export interface CustomFieldDefinition {
  id: string;
  name: string;
  label: string;
  field_type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean' | 'currency' | 'textarea' | 'url' | 'email' | 'file';
  options?: string[];
  required?: boolean;
  placeholder?: string;
  currency_code?: string;
}

interface CustomFieldRendererProps<T extends FieldValues> {
  field: CustomFieldDefinition;
  control: Control<T>;
  namePrefix?: string;
  entityType?: string;
  entityId?: string;
}

export default function CustomFieldRenderer<T extends FieldValues>({
  field,
  control,
  namePrefix = 'custom_fields',
  entityType,
  entityId,
}: CustomFieldRendererProps<T>) {
  const fieldName = `${namePrefix}.${field.name}` as Path<T>;

  switch (field.field_type) {
    case 'text':
      return (
        <Controller
          name={fieldName}
          control={control}
          render={({ field: f, fieldState }) => (
            <TextField
              {...f}
              value={f.value ?? ''}
              label={field.label}
              fullWidth
              required={field.required}
              placeholder={field.placeholder}
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          )}
        />
      );

    case 'textarea':
      return (
        <Controller
          name={fieldName}
          control={control}
          render={({ field: f, fieldState }) => (
            <TextField
              {...f}
              value={f.value ?? ''}
              label={field.label}
              fullWidth
              multiline
              rows={3}
              required={field.required}
              placeholder={field.placeholder}
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          )}
        />
      );

    case 'number':
      return (
        <Controller
          name={fieldName}
          control={control}
          render={({ field: f, fieldState }) => (
            <TextField
              {...f}
              value={f.value ?? ''}
              label={field.label}
              fullWidth
              type="number"
              required={field.required}
              placeholder={field.placeholder}
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          )}
        />
      );

    case 'currency':
      return (
        <Controller
          name={fieldName}
          control={control}
          render={({ field: f, fieldState }) => (
            <TextField
              {...f}
              value={f.value ?? ''}
              label={field.label}
              fullWidth
              type="number"
              required={field.required}
              placeholder={field.placeholder}
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {field.currency_code ?? 'USD'}
                  </InputAdornment>
                ),
              }}
            />
          )}
        />
      );

    case 'date':
      return (
        <Controller
          name={fieldName}
          control={control}
          render={({ field: f, fieldState }) => (
            <TextField
              {...f}
              value={f.value ?? ''}
              label={field.label}
              fullWidth
              type="date"
              required={field.required}
              slotProps={{ inputLabel: { shrink: true } }}
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          )}
        />
      );

    case 'select':
      return (
        <Controller
          name={fieldName}
          control={control}
          render={({ field: f, fieldState }) => (
            <TextField
              {...f}
              value={f.value ?? ''}
              label={field.label}
              fullWidth
              select
              required={field.required}
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {field.options?.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
      );

    case 'multiselect':
      return (
        <Controller
          name={fieldName}
          control={control}
          render={({ field: f, fieldState }) => (
            <Autocomplete
              multiple
              options={field.options ?? []}
              value={(f.value as string[]) ?? []}
              onChange={(_, val) => f.onChange(val)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option}
                    size="small"
                    {...getTagProps({ index })}
                    key={option}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={field.label}
                  required={field.required}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          )}
        />
      );

    case 'boolean':
      return (
        <Controller
          name={fieldName}
          control={control}
          render={({ field: f }) => (
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!f.value}
                  onChange={(e) => f.onChange(e.target.checked)}
                />
              }
              label={field.label}
            />
          )}
        />
      );

    case 'url':
      return (
        <Controller
          name={fieldName}
          control={control}
          render={({ field: f, fieldState }) => (
            <TextField
              {...f}
              value={f.value ?? ''}
              label={field.label}
              fullWidth
              type="url"
              required={field.required}
              placeholder={field.placeholder ?? 'https://'}
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          )}
        />
      );

    case 'email':
      return (
        <Controller
          name={fieldName}
          control={control}
          render={({ field: f, fieldState }) => (
            <TextField
              {...f}
              value={f.value ?? ''}
              label={field.label}
              fullWidth
              type="email"
              required={field.required}
              placeholder={field.placeholder}
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          )}
        />
      );

    case 'file':
      return (
        <Controller
          name={fieldName}
          control={control}
          render={({ field: f }) => (
            <FileFieldInput
              label={field.label}
              value={f.value as FileFieldValue | null | undefined}
              onChange={f.onChange}
              entityType={entityType}
              entityId={entityId}
              required={field.required}
            />
          )}
        />
      );

    default:
      return null;
  }
}

interface FileFieldValue {
  attachment_id: string;
  filename: string;
  url?: string;
}

function FileFieldInput({
  label,
  value,
  onChange,
  entityType,
  entityId,
  required,
}: {
  label: string;
  value?: FileFieldValue | null;
  onChange: (v: FileFieldValue | null) => void;
  entityType?: string;
  entityId?: string;
  required?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !entityType || !entityId) return;
    setError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('attachable_type', entityType);
      form.append('attachable_id', entityId);
      const { data } = await api.post('/attachments', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange({ attachment_id: data.data.id, filename: data.data.original_filename });
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  if (!entityId) {
    return (
      <Box
        sx={{
          p: 1.5,
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'action.hover',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {label}{required && ' *'} — Save the record first to upload files.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
        {label}{required && ' *'}
      </Typography>
      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
        {value?.filename && (
          <Chip
            icon={<DownloadIcon fontSize="small" />}
            label={value.filename}
            size="small"
            variant="outlined"
            component={Link}
            href={value.url ?? `/api/v1/attachments/${value.attachment_id}/download`}
            target="_blank"
            rel="noopener"
            clickable
            onDelete={() => onChange(null)}
            sx={{ maxWidth: 240, cursor: 'pointer' }}
          />
        )}
        <Button
          size="small"
          variant="outlined"
          startIcon={uploading ? <CircularProgress size={14} /> : <AttachFileIcon />}
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? 'Uploading…' : value ? 'Replace file' : 'Upload file'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
      </Box>
      {error && (
        <Typography variant="caption" color="error" display="block" mt={0.5}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
