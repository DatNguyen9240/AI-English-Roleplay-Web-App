import { create } from 'zustand';
import { authApiClient } from '@/services/authApiClient';
import { logger } from '@/utils/logger';
import type { AuthState, AuthUser } from '@/types/auth';

const STORAGE_KEY = 'auth_user';

function loadUserFromStorage(): AuthUser | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

/**
 * Zustand auth store — manages user session state.
 * HTTP calls are delegated to authApiClient (services/ layer, per README Section 3).
 * JWT token is stored as an httpOnly cookie by the server — not accessible here.
 * localStorage only holds non-sensitive user display data (id + email).
 */
export const useAuth = create<AuthState>((set) => ({
  user: loadUserFromStorage(),
  loading: false,
  error: null,

  login: async (email: string, password: string): Promise<boolean> => {
    set({ loading: true, error: null });
    try {
      const user = await authApiClient.login(email, password);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      set({ user, loading: false });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      set({ error: message, loading: false });
      return false;
    }
  },

  register: async (email: string, password: string): Promise<boolean> => {
    set({ loading: true, error: null });
    try {
      const user = await authApiClient.register(email, password);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      set({ user, loading: false });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      set({ error: message, loading: false });
      return false;
    }
  },

  logout: async (): Promise<void> => {
    try {
      await authApiClient.logout();
    } catch (err) {
      logger.error('[Auth] Logout request failed:', err);
    } finally {
      localStorage.removeItem(STORAGE_KEY);
      set({ user: null, loading: false, error: null });
    }
  },

  clearError: (): void => set({ error: null }),
}));
