import type { AuthUser } from '@/types/auth';
import { config } from '@/config';

const API_URL = config.apiUrl;

interface AuthResponse {
  user: AuthUser;
}

interface ErrorResponse {
  error?: string;
}

/**
 * HTTP client for auth endpoints.
 * Extracted from useAuth so the hook stays lean and this layer is independently testable.
 * All requests use credentials: 'include' to send/receive httpOnly JWT cookies.
 */
export const authApiClient = {
  async login(email: string, password: string): Promise<AuthUser> {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const data: AuthResponse & ErrorResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? 'Login failed');
    }

    return data.user;
  },

  async register(email: string, password: string): Promise<AuthUser> {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const data: AuthResponse & ErrorResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? 'Registration failed');
    }

    return data.user;
  },

  async logout(): Promise<void> {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  },
};
