export class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AppError extends BaseError {
  constructor(
    message: string,
    public code: string,
    public status: number = 500,
    public details?: unknown
  ) {
    super(message);
  }
}

export class AssertionError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

export class WorkspaceError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'WORKSPACE_ERROR', 500, details);
  }
}

export class GitError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'GIT_ERROR', 500, details);
  }
}

export class TaskError extends AppError {
  constructor(
    message: string,
    public taskId: string,
    details?: unknown
  ) {
    super(message, 'TASK_ERROR', 500, details);
  }
}

export class OpenAIError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'OPENAI_ERROR', 502, details);
  }
}

export class ConfigError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFIG_ERROR', 500, details);
  }
}

export class AuthError extends AppError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR', 401);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string) {
    super(message, 'RATE_LIMIT', 429);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function normalizeError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, 'INTERNAL_ERROR', 500, {
      name: error.name,
      stack: error.stack
    });
  }

  return new AppError(
    typeof error === 'string' ? error : 'An unknown error occurred',
    'UNKNOWN_ERROR',
    500,
    error
  );
}

export function handleError(error: unknown): never {
  const normalizedError = normalizeError(error);
  
  // Log error details
  console.error('Error:', {
    message: normalizedError.message,
    code: normalizedError.code,
    status: normalizedError.status,
    details: normalizedError.details,
    stack: normalizedError.stack
  });

  throw normalizedError;
}

export type ErrorConstructor = new (message: string) => BaseError;

export function assertCondition(
  condition: boolean,
  message: string,
  ErrorType: ErrorConstructor = AssertionError
): asserts condition {
  if (!condition) {
    throw new ErrorType(message);
  }
}