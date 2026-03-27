import {
  TextField,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Autocomplete,
  Chip,
  InputAdornment,
} from '@mui/material';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

export interface CustomFieldDefinition {
  id: string;
  name: string;
  label: string;
  field_type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean' | 'currency' | 'textarea' | 'url' | 'email';
  options?: string[];
  required?: boolean;
  placeholder?: string;
  currency_code?: string;
}

interface CustomFieldRendererProps<T extends FieldValues> {
  field: CustomFieldDefinition;
  control: Control<T>;
  namePrefix?: string;
}

export default function CustomFieldRenderer<T extends FieldValues>({
  field,
  control,
  namePrefix = 'custom_fields',
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

    default:
      return null;
  }
}
