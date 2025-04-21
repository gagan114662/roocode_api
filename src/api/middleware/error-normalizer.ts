import { Response, NextFunction } from 'express';
import { AppError } from '../core/errors';
import { Request, ErrorRequestHandler, RequestHandler } from '../types/express';
import { getRequestTiming } from '../types/timing';

export function createErrorMiddleware(
  handler: (error: AppError, req: Request, res: Response, next: NextFunction) => void
): ErrorRequestHandler {
  return (err: unknown, req: Request, res: Response, next: NextFunction) => {
    // Convert any error to AppError format
    const normalizedError = normalizeError(err);
    handler(normalizedError, req, res, next);
  };
}

function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(
      error.message,
      'INTERNAL_ERROR',
      500,
      {
        name: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    );
  }

  return new AppError(
    typeof error === 'string' ? error : 'An unknown error occurred',
    'UNKNOWN_ERROR',
    500,
    { originalError: error }
  );
}

// Add timing information to request
export const requestTimer: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  req.startTime = Date.now();
  next();
};

// Standard error handlers
export const loggingMiddleware: ErrorRequestHandler = createErrorMiddleware((error, req, res, next) => {
  const timing = getRequestTiming(req);
  
  console.error('Error:', {
    method: req.method,
    path: req.path,
    duration: timing.duration,
    error: {
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
  });
  next(error);
});

export const responseMiddleware: ErrorRequestHandler = createErrorMiddleware((error, req, res) => {
  const timing = getRequestTiming(req);
  
  const response = {
    status: 'error',
    error: {
      message: error.message,
      code: error.code,
      details: process.env.NODE_ENV === 'development' ? error.details : undefined
    },
    timing: process.env.NODE_ENV === 'development' ? timing : undefined
  };

  res.status(error.status).json(response);
});