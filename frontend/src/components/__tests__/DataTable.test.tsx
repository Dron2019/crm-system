import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import DataTable, { type Column } from '@/components/DataTable';
import { renderWithProviders } from '@/test/test-utils';

interface TestRow {
  id: string;
  name: string;
  email: string;
}

const columns: Column<TestRow>[] = [
  { id: 'name', label: 'Name', sortable: true, render: (row) => row.name },
  { id: 'email', label: 'Email', render: (row) => row.email },
];

const rows: TestRow[] = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' },
];

describe('DataTable', () => {
  const baseProps = {
    columns,
    rows,
    total: 2,
    page: 0,
    rowsPerPage: 10,
    onPageChange: vi.fn(),
  };

  it('renders column headers', () => {
    renderWithProviders(<DataTable {...baseProps} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders row data', () => {
    renderWithProviders(<DataTable {...baseProps} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
  });

  it('shows empty message when no rows', () => {
    renderWithProviders(
      <DataTable {...baseProps} rows={[]} total={0} emptyMessage="Nothing here" />,
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('shows loading spinner', () => {
    renderWithProviders(<DataTable {...baseProps} loading />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders search field when onSearchChange provided', () => {
    renderWithProviders(
      <DataTable {...baseProps} onSearchChange={vi.fn()} searchPlaceholder="Find contacts…" />,
    );
    expect(screen.getByPlaceholderText('Find contacts…')).toBeInTheDocument();
  });

  it('calls onSearchChange when typing in search', async () => {
    const onSearchChange = vi.fn();
    const { user } = renderWithProviders(
      <DataTable {...baseProps} onSearchChange={onSearchChange} />,
    );
    const searchInput = screen.getByPlaceholderText('Search…');
    await user.type(searchInput, 'test');
    expect(onSearchChange).toHaveBeenCalled();
  });

  it('calls onRowClick when row clicked', async () => {
    const onRowClick = vi.fn();
    const { user } = renderWithProviders(
      <DataTable {...baseProps} onRowClick={onRowClick} />,
    );
    await user.click(screen.getByText('Alice'));
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it('renders checkboxes when selectable', () => {
    renderWithProviders(
      <DataTable {...baseProps} selectable onSelectionChange={vi.fn()} />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    // 1 header checkbox + 2 row checkboxes
    expect(checkboxes).toHaveLength(3);
  });

  it('calls onSelectionChange when checkbox clicked', async () => {
    const onSelectionChange = vi.fn();
    const { user } = renderWithProviders(
      <DataTable {...baseProps} selectable selected={[]} onSelectionChange={onSelectionChange} />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]); // first row checkbox
    expect(onSelectionChange).toHaveBeenCalledWith(['1']);
  });

  it('calls onSortChange when sortable header clicked', async () => {
    const onSortChange = vi.fn();
    const { user } = renderWithProviders(
      <DataTable {...baseProps} sortField="name" sortDirection="asc" onSortChange={onSortChange} />,
    );
    await user.click(screen.getByText('Name'));
    expect(onSortChange).toHaveBeenCalledWith('name', 'desc');
  });
});
