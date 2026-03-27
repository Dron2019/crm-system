import { useState, type ReactNode } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  TextField,
  InputAdornment,
  Typography,
  Checkbox,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

export interface Column<T> {
  id: string;
  label: string;
  sortable?: boolean;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  render: (row: T) => ReactNode;
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[];
  rows: T[];
  total: number;
  page: number;
  rowsPerPage: number;
  loading?: boolean;
  search?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  selectable?: boolean;
  selected?: string[];
  searchPlaceholder?: string;
  emptyMessage?: string;
  toolbar?: ReactNode;
  onPageChange: (page: number) => void;
  onRowsPerPageChange?: (perPage: number) => void;
  onSearchChange?: (search: string) => void;
  onSortChange?: (field: string, direction: 'asc' | 'desc') => void;
  onSelectionChange?: (ids: string[]) => void;
  onRowClick?: (row: T) => void;
}

export default function DataTable<T extends { id: string }>({
  columns,
  rows,
  total,
  page,
  rowsPerPage,
  loading,
  search,
  sortField,
  sortDirection = 'asc',
  selectable,
  selected = [],
  searchPlaceholder = 'Search…',
  emptyMessage = 'No records found.',
  toolbar,
  onPageChange,
  onRowsPerPageChange,
  onSearchChange,
  onSortChange,
  onSelectionChange,
  onRowClick,
}: DataTableProps<T>) {
  const [localSearch, setLocalSearch] = useState(search ?? '');
  const colSpan = columns.length + (selectable ? 1 : 0);

  const allSelected = rows.length > 0 && rows.every((r) => selected.includes(r.id));
  const someSelected = rows.some((r) => selected.includes(r.id)) && !allSelected;

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(selected.filter((id) => !rows.some((r) => r.id === id)));
    } else {
      const newIds = rows.map((r) => r.id).filter((id) => !selected.includes(id));
      onSelectionChange([...selected, ...newIds]);
    }
  };

  const handleSelectRow = (id: string) => {
    if (!onSelectionChange) return;
    onSelectionChange(
      selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id],
    );
  };

  const handleSort = (field: string) => {
    if (!onSortChange) return;
    const isAsc = sortField === field && sortDirection === 'asc';
    onSortChange(field, isAsc ? 'desc' : 'asc');
  };

  return (
    <Box>
      {(onSearchChange || toolbar) && (
        <Paper sx={{ mb: 2, p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          {onSearchChange && (
            <TextField
              placeholder={searchPlaceholder}
              size="small"
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                onSearchChange(e.target.value);
                onPageChange(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 300 }}
            />
          )}
          {toolbar && <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>{toolbar}</Box>}
        </Paper>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={someSelected}
                    checked={allSelected}
                    onChange={handleSelectAll}
                  />
                </TableCell>
              )}
              {columns.map((col) => (
                <TableCell
                  key={col.id}
                  align={col.align}
                  width={col.width}
                >
                  {col.sortable && onSortChange ? (
                    <TableSortLabel
                      active={sortField === col.id}
                      direction={sortField === col.id ? sortDirection : 'asc'}
                      onClick={() => handleSort(col.id)}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : (
                    col.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={colSpan} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">{emptyMessage}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  hover
                  sx={onRowClick ? { cursor: 'pointer' } : undefined}
                  onClick={() => onRowClick?.(row)}
                  selected={selected.includes(row.id)}
                >
                  {selectable && (
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.includes(row.id)}
                        onChange={() => handleSelectRow(row.id)}
                      />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col.id} align={col.align}>
                      {col.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, newPage) => onPageChange(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={
            onRowsPerPageChange
              ? (e) => {
                  onRowsPerPageChange(parseInt(e.target.value, 10));
                  onPageChange(0);
                }
              : undefined
          }
        />
      </TableContainer>
    </Box>
  );
}
