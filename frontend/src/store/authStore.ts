import { create } from 'zustand';
import { apiClient } from '../api/client';
import type { User } from '../types';
// Circular import seguro: useNotesStore solo se usa en cuerpos de función,
// nunca en el nivel de evaluación del módulo.
import { useNotesStore } from './notesStore';
import { useSubjectsStore } from './subjectsStore';
import { db } from '../db/dexie';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  initAuth: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  forgotPassword: (email: string) => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: localStorage.getItem('beta3m_token'),
  isAuthenticated: !!localStorage.getItem('beta3m_token'),
  isGuest: !localStorage.getItem('beta3m_token'),
  isInitializing: !!localStorage.getItem('beta3m_token'),

  initAuth: async () => {
    const token = localStorage.getItem('beta3m_token');
    if (!token) {
      set({ isInitializing: false });
      return;
    }
    try {
      const user = await apiClient.get<User>('/users/me');
      set({ user, isInitializing: false, isGuest: false });
    } catch {
      localStorage.removeItem('beta3m_token');
      useNotesStore.getState().cleanup();
      useSubjectsStore.getState().cleanup();
      db.notes.clear();
      db.subjects.clear();
      set({ user: null, token: null, isAuthenticated: false, isInitializing: false, isGuest: true });
    }
  },

  login: async (email, password) => {
    const data = await apiClient.post<{ token: string; user: User }>(
      '/auth/login', { email, password }
    );
    localStorage.setItem('beta3m_token', data.token);
    set({ user: data.user, token: data.token, isAuthenticated: true, isGuest: false });
  },

  register: async (email, password) => {
    const data = await apiClient.post<{ token: string; user: User }>(
      '/auth/register', { email, password }
    );
    localStorage.setItem('beta3m_token', data.token);
    set({ user: data.user, token: data.token, isAuthenticated: true, isGuest: false });
  },

  logout: () => {
    // Limpiar stores y base de datos local para evitar fuga de datos entre usuarios
    useNotesStore.getState().cleanup();
    useSubjectsStore.getState().cleanup();
    db.notes.clear();
    db.subjects.clear();

    localStorage.removeItem('beta3m_token');
    set({ user: null, token: null, isAuthenticated: false, isGuest: true });
  },

  updateUser: (data) => {
    set((s) => ({ user: s.user ? { ...s.user, ...data } : s.user }));
  },

  forgotPassword: async (email) => {
    await apiClient.post('/auth/forgot-password', { email });
  },
}));
