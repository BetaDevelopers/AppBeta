import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: async (email, password) => {
        // Mock login
        const mockUser = { id: 'user-123', email };
        const mockToken = 'mock-jwt-token';
        localStorage.setItem('beta3m_token', mockToken);
        set({ user: mockUser, token: mockToken, isAuthenticated: true });
      },
      register: async (email, password) => {
        // Mock register
        const mockUser = { id: 'user-123', email };
        const mockToken = 'mock-jwt-token';
        localStorage.setItem('beta3m_token', mockToken);
        set({ user: mockUser, token: mockToken, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('beta3m_token');
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'beta3m_auth_storage',
    }
  )
);
