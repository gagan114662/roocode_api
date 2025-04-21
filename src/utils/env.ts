/**
 * Environment variable utilities and type-safe accessors
 */

/**
 * Get a required environment variable
 * @throws {Error} if the environment variable is not set
 */
export function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

/**
 * Get an optional environment variable with a default value
 */
export function getEnvVar(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

/**
 * Get a number from an environment variable
 * @throws {Error} if the value cannot be parsed as a number
 */
export function getNumericEnvVar(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }

  return parsed;
}

/**
 * Get a boolean environment variable
 */
export function getBooleanEnvVar(name: string, defaultValue: boolean): boolean {
  const value = process.env[name]?.toLowerCase();
  if (!value) {
    return defaultValue;
  }

  return value === 'true' || value === '1' || value === 'yes';
}

/**
 * Get an array from a comma-separated environment variable
 */
export function getArrayEnvVar(name: string, defaultValue: string[] = []): string[] {
  const value = process.env[name];
  if (!value) {
    return defaultValue;
  }

  return value.split(',').map(item => item.trim());
}

/**
 * Check if we're in development mode
 */
export const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Check if we're in test mode
 */
export const isTest = process.env.NODE_ENV === 'test';

/**
 * Check if we're in production mode
 */
export const isProduction = process.env.NODE_ENV === 'production';

/**
 * Common environment variables used throughout the application
 */
export const env = {
  NODE_ENV: getRequiredEnvVar('NODE_ENV'),
  PORT: getNumericEnvVar('PORT', 3000),
  LOG_LEVEL: getEnvVar('LOG_LEVEL', 'info'),
  API_KEY: getRequiredEnvVar('OPENAI_API_KEY'),
  MAX_REQUEST_SIZE: getEnvVar('MAX_REQUEST_SIZE', '10mb'),
  CORS_ORIGIN: getEnvVar('CORS_ORIGIN', '*'),
  ENABLE_DOCS: getBooleanEnvVar('ENABLE_DOCS', isDevelopment),
  DEBUG: getBooleanEnvVar('DEBUG', isDevelopment)
} as const;