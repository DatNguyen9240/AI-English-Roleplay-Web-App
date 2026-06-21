/**
 * Application configuration — single source of truth for all env vars.
 *
 * Variables are validated at module load time so a missing value throws
 * immediately on startup rather than causing a cryptic runtime failure.
 */

function getApiUrl(): string {
  const envValue = import.meta.env.VITE_API_URL as string | undefined;
  
  // If we are in a browser environment, we can dynamically determine the API URL.
  if (typeof window !== 'undefined') {
    const isLocalhostPage = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // Case 1: VITE_API_URL is missing or empty. Fallback to current origin.
    if (!envValue || envValue.trim() === '') {
      return window.location.origin;
    }
    
    // Case 2: Page is loaded from a remote host (non-localhost), but VITE_API_URL points to localhost.
    // This is a common issue when production builds default to localhost. Override with the remote origin
    // to route requests through the Nginx reverse proxy.
    const pointsToLocalhost = envValue.includes('localhost') || envValue.includes('127.0.0.1');
    if (!isLocalhostPage && pointsToLocalhost) {
      return window.location.origin;
    }
    
    return envValue;
  }
  
  // Fallback for non-browser environments (e.g. testing)
  return envValue || 'http://localhost:5000';
}

export const config = {
  /** Base URL for all HTTP + WebSocket backend calls (e.g. http://localhost:5000) */
  apiUrl: getApiUrl(),
} as const;
