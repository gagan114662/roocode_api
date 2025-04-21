import { Response, NextFunction } from 'express';
import { Request } from '../types/express';
import { AppError } from '../core/errors';
import { z } from 'zod';

export interface ValidationOptions {
  stripUnknown?: boolean;
  strict?: boolean;
}

// Generic validation middleware creator
export function validateRequest<T extends z.ZodType>(
  schema: T,
  location: 'body' | 'query' | 'params' = 'body',
  options: ValidationOptions = { stripUnknown: true }
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const target = req[location];
      const parsed = await schema.parseAsync(target);
      
      if (options.stripUnknown) {
        req[location] = parsed;
      }
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(
          'Validation failed',
          'VALIDATION_ERROR',
          400,
          {
            errors: error.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message
            }))
          }
        ));
        return;
      }
      next(error);
    }
  };
}

// Common validation schemas
export const commonSchemas = {
  id: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  timestamp: z.string().datetime(),
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20)
  })
};

// Request size validation
export const validateRequestSize = (maxSize: string = '10mb') => {
  const maxBytes = parseInt(maxSize) * 1024 * 1024; // Convert to bytes
  
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    if (contentLength > maxBytes) {
      next(new AppError(
        'Request body too large',
        'PAYLOAD_TOO_LARGE',
        413,
        { maxSize, contentLength }
      ));
      return;
    }
    
    next();
  };
};

// API key validation
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || typeof apiKey !== 'string') {
    next(new AppError('API key is required', 'UNAUTHORIZED', 401));
    return;
  }

  // TODO: Add actual API key validation logic
  if (process.env.NODE_ENV === 'development' && apiKey === 'test-key') {
    next();
    return;
  }

  next(new AppError('Invalid API key', 'UNAUTHORIZED', 401));
};

// Content type validation
export const validateContentType = (contentType: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestContentType = req.headers['content-type'];
    
    if (!requestContentType || !requestContentType.includes(contentType)) {
      next(new AppError(
        `Content-Type must be ${contentType}`,
        'INVALID_CONTENT_TYPE',
        415,
        { expected: contentType, received: requestContentType }
      ));
      return;
    }
    
    next();
  };
};