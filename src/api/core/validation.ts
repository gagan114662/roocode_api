import { z } from 'zod';
import { AppError } from './errors';

// Server configuration validation schema
const corsSchema = z.object({
  origin: z.string(),
  methods: z.array(z.string()),
  allowedHeaders: z.array(z.string())
});

const securitySchema = z.object({
  enableCSP: z.boolean(),
  enableCOEP: z.boolean()
});

const apiSchema = z.object({
  basePath: z.string().startsWith('/'),
  version: z.string().startsWith('v')
});

const docsSchema = z.object({
  enabled: z.boolean(),
  path: z.string().startsWith('/')
});

const serverConfigSchema = z.object({
  port: z.number().int().positive(),
  maxRequestSize: z.string().regex(/^\d+mb$/),
  cors: corsSchema,
  security: securitySchema,
  api: apiSchema,
  docs: docsSchema
});

// Service configuration validation schema
const serviceConfigSchema = z.object({
  name: z.string(),
  errorReporting: z.object({
    includeStack: z.boolean()
  }),
  logging: z.object({
    enabled: z.boolean(),
    format: z.enum(['dev', 'combined'])
  })
});

// Environment validation schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  OPENAI_API_KEY: z.string().min(1),
  PORT: z.string().regex(/^\d+$/).optional(),
  MAX_REQUEST_SIZE: z.string().regex(/^\d+mb$/).optional(),
  CORS_ORIGIN: z.string().optional()
});

export interface ValidationResult {
  isValid: boolean;
  errors?: z.ZodError | Error;
}

export class ConfigValidator {
  static validateServerConfig(config: unknown): ValidationResult {
    try {
      serverConfigSchema.parse(config);
      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        errors: error instanceof z.ZodError ? error : new Error('Invalid server config')
      };
    }
  }

  static validateServiceConfig(config: unknown): ValidationResult {
    try {
      serviceConfigSchema.parse(config);
      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        errors: error instanceof z.ZodError ? error : new Error('Invalid service config')
      };
    }
  }

  static validateEnv(): void {
    try {
      envSchema.parse(process.env);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const missingVars = error.errors
          .filter(err => err.code === 'invalid_type' && err.received === 'undefined')
          .map(err => err.path.join('.'));

        throw new AppError(
          `Missing or invalid environment variables: ${missingVars.join(', ')}`,
          'CONFIG_ERROR',
          500,
          error.errors
        );
      }
      throw error;
    }
  }
}

export function validateConfig(serverConfig: unknown, serviceConfig: unknown): void {
  const serverValidation = ConfigValidator.validateServerConfig(serverConfig);
  const serviceValidation = ConfigValidator.validateServiceConfig(serviceConfig);

  if (!serverValidation.isValid || !serviceValidation.isValid) {
    throw new AppError(
      'Invalid configuration',
      'CONFIG_ERROR',
      500,
      {
        serverErrors: serverValidation.errors,
        serviceErrors: serviceValidation.errors
      }
    );
  }

  ConfigValidator.validateEnv();
}