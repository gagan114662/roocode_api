import { 
  AppError, 
  ValidationError, 
  NotFoundError, 
  WorkspaceError,
  GitError,
  TaskError,
  OpenAIError,
  ConfigError,
  AuthError,
  RateLimitError
} from './errors';

export interface ErrorMetadata {
  code: string;
  status: number;
  details?: unknown;
}

export interface ErrorFactory {
  create(message: string, details?: unknown): AppError;
  withMetadata(metadata: Partial<ErrorMetadata>): ErrorFactory;
}

class AppErrorFactory implements ErrorFactory {
  constructor(
    private metadata: ErrorMetadata = {
      code: 'UNKNOWN_ERROR',
      status: 500
    }
  ) {}

  create(message: string, details?: unknown): AppError {
    return new AppError(
      message,
      this.metadata.code,
      this.metadata.status,
      details || this.metadata.details
    );
  }

  withMetadata(metadata: Partial<ErrorMetadata>): ErrorFactory {
    return new AppErrorFactory({
      ...this.metadata,
      ...metadata
    });
  }
}

export const createError = new AppErrorFactory();

// Predefined error factories
export const validation = createError.withMetadata({
  code: 'VALIDATION_ERROR',
  status: 400
});

export const notFound = createError.withMetadata({
  code: 'NOT_FOUND',
  status: 404
});

export const workspace = createError.withMetadata({
  code: 'WORKSPACE_ERROR',
  status: 500
});

export const git = createError.withMetadata({
  code: 'GIT_ERROR',
  status: 500
});

export const task = createError.withMetadata({
  code: 'TASK_ERROR',
  status: 500
});

export const openai = createError.withMetadata({
  code: 'OPENAI_ERROR',
  status: 502
});

export const config = createError.withMetadata({
  code: 'CONFIG_ERROR',
  status: 500
});

export const auth = createError.withMetadata({
  code: 'AUTH_ERROR',
  status: 401
});

export const rateLimit = createError.withMetadata({
  code: 'RATE_LIMIT',
  status: 429
});

// Helper function for creating domain-specific errors
export function createDomainError(
  domain: string,
  defaultStatus: number = 500
): ErrorFactory {
  return createError.withMetadata({
    code: `${domain.toUpperCase()}_ERROR`,
    status: defaultStatus
  });
}

// Usage example:
// const userError = createDomainError('user');
// throw userError.create('User not authorized');