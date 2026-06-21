const pino = require('pino');
const pinoPretty = require('pino-pretty');

/**
 * Singleton structured logger for the entire backend.
 * Configured once from environment variables and re-used across all modules.
 *
 * - Development: pretty-printed with colors (via pino-pretty)
 * - Production:  raw JSON (standard for log aggregators like Datadog, CloudWatch)
 */
const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
  },
  process.env.NODE_ENV !== 'production' ? pinoPretty() : undefined
);

module.exports = logger;
