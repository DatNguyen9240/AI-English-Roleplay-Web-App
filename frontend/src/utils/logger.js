/**
 * Minimal frontend logger that strips debug output in production builds.
 *
 * Rules:
 *  - log / warn  → only emitted in development (import.meta.env.DEV)
 *  - error        → always emitted (errors are always worth knowing)
 *
 * Usage:
 *   import { logger } from '@/utils/logger';
 *   logger.log('[Socket] connected');
 *   logger.warn('[VAD] sequence gap');
 *   logger.error('[Audio] failed to start', err);
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /** Debug / info — suppressed in production builds */
  log: (...args) => {
    if (isDev) console.log(...args);
  },

  /** Warnings — suppressed in production builds */
  warn: (...args) => {
    if (isDev) console.warn(...args);
  },

  /** Errors — always surfaced regardless of environment */
  error: (...args) => {
    console.error(...args);
  },
};
