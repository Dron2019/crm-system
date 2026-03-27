import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { renderWithProviders } from '@/test/test-utils';

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    title: 'Delete Contact',
    message: 'Are you sure you want to delete this contact?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders title and message when open', () => {
    renderWithProviders(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Delete Contact')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this contact?')).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    renderWithProviders(<ConfirmDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('Delete Contact')).not.toBeInTheDocument();
  });

  it('shows default confirm label', () => {
    renderWithProviders(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('shows custom confirm label', () => {
    renderWithProviders(<ConfirmDialog {...defaultProps} confirmLabel="Remove" />);
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', async () => {
    const onConfirm = vi.fn();
    const { user } = renderWithProviders(
      <ConfirmDialog {...defaultProps} onConfirm={onConfirm} />,
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when cancel button clicked', async () => {
    const onCancel = vi.fn();
    const { user } = renderWithProviders(
      <ConfirmDialog {...defaultProps} onCancel={onCancel} />,
    );
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('disables buttons when loading', () => {
    renderWithProviders(<ConfirmDialog {...defaultProps} loading />);
    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});
