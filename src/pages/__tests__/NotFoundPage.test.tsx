import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import NotFoundPage from '@/pages/NotFoundPage';
import { renderWithProviders } from '@/test/test-utils';

describe('NotFoundPage', () => {
  it('renders 404 heading', () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders page not found message', () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByText('Page not found')).toBeInTheDocument();
  });

  it('has a button to go to dashboard', () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeInTheDocument();
  });
});
