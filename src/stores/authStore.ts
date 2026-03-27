import { create } from 'zustand';
import api, { getCsrfCookie } from '@/lib/api';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, password_confirmation: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    await getCsrfCookie();
    const { data } = await api.post('/auth/login', { email, password });
    set({ user: data.data, isAuthenticated: true });
  },

  register: async (name, email, password, password_confirmation) => {
    await getCsrfCookie();
    const { data } = await api.post('/auth/register', { name, email, password, password_confirmation });
    set({ user: data.data, isAuthenticated: true });
  },

  logout: async () => {
    await api.post('/auth/logout');
    set({ user: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    try {
      const { data } = await api.get('/auth/user');
      set({ user: data.data, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
