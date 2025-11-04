/**
 * Logger utility that only logs in development mode
 * In production, all logs are suppressed to prevent exposing sensitive information
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Log general information (only in development)
   */
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Log error messages (only in development)
   * In production, you should send errors to a monitoring service like Sentry
   */
  error: (...args: any[]) => {
    if (isDevelopment) {
      console.error(...args);
    }
    // TODO: In production, send to error tracking service
    // Example: Sentry.captureException(args[0]);
  },

  /**
   * Log warning messages (only in development)
   */
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * Log info messages (only in development)
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  /**
   * Log debug messages (only in development)
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  /**
   * Log table data (only in development)
   */
  table: (data: any) => {
    if (isDevelopment) {
      console.table(data);
    }
  },
};
