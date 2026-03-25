import { create } from 'zustand';
import { apiClient } from '../api/client';
import type { User } from '../types';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: localStorage.getItem('beta3m_token'),
  isAuthenticated: !!localStorage.getItem('beta3m_token'),
  isInitializing: !!localStorage.getItem('beta3m_token'),

  initAuth: async () => {
    const token = localStorage.getItem('beta3m_token');
    if (!token) {
      set({ isInitializing: false });
      return;
    }
    try {
      const user = await apiClient.get<User>('/users/me');
      set({ user, isInitializing: false });
    } catch {
      localStorage.removeItem('beta3m_token');
      set({ user: null, token: null, isAuthenticated: false, isInitializing: false });
    }
  },

  login: async (email, password) => {
    const data = await apiClient.post<{ token: string; user: User }>(
      '/auth/login', { email, password }
    );
    localStorage.setItem('beta3m_token', data.token);
    set({ user: data.user, token: data.token, isAuthenticated: true });
  },

  register: async (email, password) => {
    const data = await apiClient.post<{ token: string; user: User }>(
      '/auth/register', { email, password }
    );
    localStorage.setItem('beta3m_token', data.token);
    set({ user: data.user, token: data.token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('beta3m_token');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
