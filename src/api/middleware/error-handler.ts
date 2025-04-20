import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: unknown;
}

export class ValidationError extends Error implements ApiError {
  status = 400;
  code = 'VALIDATION_ERROR';
  details: z.ZodError;

  constructor(error: z.ZodError) {
    super('Validation failed');
    this.details = error;
  }
}

export class NotFoundError extends Error implements ApiError {
  status = 404;
  code = 'NOT_FOUND';

  constructor(resource: string) {
    super(`${resource} not found`);
  }
}

export class BadRequestError extends Error implements ApiError {
  status = 400;
  code = 'BAD_REQUEST';

  constructor(message: string) {
    super(message);
  }
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    code: err.code,
    details: err.details
  });

  // Default to 500 internal server error if status not specified
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';

  const response = {
    status: 'error',
    error: {
      message: err.message,
      code
    }
  };

  // Only include error details in development
  if (process.env.NODE_ENV !== 'production' && err.details) {
    (response.error as any).details = err.details;
  }

  // Send validation errors with details even in production
  if (err instanceof ValidationError) {
    (response.error as any).details = err.details.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message
    }));
  }

  res.status(status).json(response);
}

// Catch 404s
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    status: 'error',
    error: {
      message: 'Resource not found',
      code: 'NOT_FOUND'
    }
  });
}

// Convert Zod errors to ValidationError
export function zodErrorHandler(err: unknown) {
  if (err instanceof z.ZodError) {
    return new ValidationError(err);
  }
  return err;
}