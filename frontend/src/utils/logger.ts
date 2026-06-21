/**
 * Minimal frontend logger that strips debug output in production builds.
 *
 * Rules:
 *  - log / warn  → only emitted in development (import.meta.env.DEV)
 *  - error        → always emitted (errors are always worth knowing)
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /** Debug / info — suppressed in production builds */
  log: (...args: unknown[]): void => {
    if (isDev) console.log(...args);
  },

  /** Warnings — suppressed in production builds */
  warn: (...args: unknown[]): void => {
    if (isDev) console.warn(...args);
  },

  /** Errors — always surfaced regardless of environment */
  error: (...args: unknown[]): void => {
    console.error(...args);
  },
};
