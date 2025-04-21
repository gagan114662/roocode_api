import { Response, NextFunction } from 'express';
import { Request } from '../types/express';
import { safeGetTiming } from '../types/timing';
import { AppError } from '../core/errors';
import { z } from 'zod';

export interface ErrorResponseBody {
  status: 'error';
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
  timing?: {
    duration: number;
  };
}

// Convert Zod validation errors to AppError format
export function zodErrorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof z.ZodError) {
    const validationError = new AppError(
      'Validation failed',
      'VALIDATION_ERROR',
      400,
      {
        errors: err.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      }
    );
    next(validationError);
    return;
  }
  next(err);
}

// Log all errors with timing information
export function errorLogger(err: unknown, req: Request, res: Response, next: NextFunction): void {
  const error = err instanceof AppError ? err : new AppError(
    err instanceof Error ? err.message : 'An unknown error occurred',
    'INTERNAL_ERROR',
    500,
    { originalError: err }
  );

  const timing = safeGetTiming(req);
  console.error('Error:', {
    method: req.method,
    path: req.path,
    timing: timing ? { duration: timing.duration } : undefined,
    error: {
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
  });

  next(error);
}

// Send error response with optional timing info
export function errorResponder(err: unknown, req: Request, res: Response, next: NextFunction): void {
  const error = err instanceof AppError ? err : new AppError(
    err instanceof Error ? err.message : 'An unknown error occurred',
    'INTERNAL_ERROR',
    500,
    { originalError: err }
  );

  const timing = safeGetTiming(req);
  const response: ErrorResponseBody = {
    status: 'error',
    error: {
      message: error.message,
      code: error.code,
      details: process.env.NODE_ENV === 'development' ? error.details : undefined
    }
  };

  if (timing && process.env.NODE_ENV === 'development') {
    response.timing = {
      duration: timing.duration
    };
  }

  res.status(error.status).json(response);
}

// Handle 404 errors
export function notFoundHandler(req: Request, res: Response): void {
  const timing = safeGetTiming(req);
  const response: ErrorResponseBody = {
    status: 'error',
    error: {
      message: `Cannot ${req.method} ${req.path}`,
      code: 'NOT_FOUND'
    }
  };

  if (timing && process.env.NODE_ENV === 'development') {
    response.timing = {
      duration: timing.duration
    };
  }

  res.status(404).json(response);
}