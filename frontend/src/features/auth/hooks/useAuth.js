import { create } from 'zustand';
import { logger } from '../../../utils/logger';

const API_URL = import.meta.env.VITE_API_URL;

export const useAuth = create((set) => ({
  user: localStorage.getItem('auth_user')
    ? JSON.parse(localStorage.getItem('auth_user'))
    : null,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Login failed');
      }

      localStorage.setItem('auth_user', JSON.stringify(data.user));
      set({ user: data.user, loading: false });
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  register: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Registration failed');
      }

      localStorage.setItem('auth_user', JSON.stringify(data.user));
      set({ user: data.user, loading: false });
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  logout: async () => {
    set({ loading: true, error: null });
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      logger.error('[Auth] Logout request failed:', err);
    } finally {
      localStorage.removeItem('auth_user');
      set({ user: null, loading: false, error: null });
    }
  },

  clearError: () => set({ error: null }),
}));
