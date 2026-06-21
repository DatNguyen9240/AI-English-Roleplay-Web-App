/**
 * Application configuration — single source of truth for all env vars.
 *
 * Variables are validated at module load time so a missing value throws
 * immediately on startup rather than causing a cryptic runtime failure.
 */

function requireEnv(key: string): string {
  const value = import.meta.env[key] as string | undefined;
  if (!value) {
    throw new Error(
      `[config] Missing required environment variable: ${key}. ` +
      'Check that frontend/.env.local is present and the dev server has been restarted.'
    );
  }
  return value;
}

export const config = {
  /** Base URL for all HTTP + WebSocket backend calls (e.g. http://localhost:5000) */
  apiUrl: requireEnv('VITE_API_URL'),
} as const;
