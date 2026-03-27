import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import LoginPage from '@/pages/LoginPage';
import { renderWithProviders } from '@/test/test-utils';

// Mock the auth store
vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    login: vi.fn(),
  }),
}));

describe('LoginPage', () => {
  it('renders the sign in form', () => {
    renderWithProviders(<LoginPage />, { route: '/login' });
    expect(screen.getByText('CRM System')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
  });

  it('has email and password fields', () => {
    renderWithProviders(<LoginPage />, { route: '/login' });
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('has sign in button', () => {
    renderWithProviders(<LoginPage />, { route: '/login' });
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('has link to register page', () => {
    renderWithProviders(<LoginPage />, { route: '/login' });
    expect(screen.getByText(/sign up/i)).toBeInTheDocument();
  });

  it('has link to forgot password', () => {
    renderWithProviders(<LoginPage />, { route: '/login' });
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });

  it('shows validation errors for empty submit', async () => {
    const { user } = renderWithProviders(<LoginPage />, { route: '/login' });
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    // Zod validation should trigger
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });
});
