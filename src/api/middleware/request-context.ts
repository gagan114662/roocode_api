import { Response, NextFunction } from 'express';
import { Request, RequestHandler, ErrorRequestHandler } from '../types/express';

export interface RequestContext {
  startTime: number;
  requestId: string;
}

let requestCounter = 0;

export const addRequestContext = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = `req_${Date.now()}_${++requestCounter}`;
  const startTime = Date.now();

  // Add context to request
  req.startTime = startTime;
  (req as any).context = {
    requestId,
    startTime
  };

  // Add timing header to response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${duration}ms`);
  });

  next();
};

// Re-export common middleware
export { asyncHandler, asyncErrorHandler } from '../types/express';

// Type-safe middleware composition for regular middleware
export function composeMiddleware(...middleware: RequestHandler[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const executeMiddleware = (index: number): void => {
      if (index === middleware.length) {
        next();
        return;
      }

      middleware[index](req, res, (err?: any) => {
        if (err) {
          next(err);
          return;
        }
        executeMiddleware(index + 1);
      });
    };

    executeMiddleware(0);
  };
}

// Type-safe middleware composition for error handling middleware
export function composeErrorMiddleware(...middleware: ErrorRequestHandler[]): ErrorRequestHandler {
  return (err: unknown, req: Request, res: Response, next: NextFunction): void => {
    const executeMiddleware = (index: number, currentError: unknown): void => {
      if (index === middleware.length) {
        next(currentError);
        return;
      }

      middleware[index](currentError, req, res, (nextError?: unknown) => {
        if (nextError) {
          executeMiddleware(index + 1, nextError);
          return;
        }
        executeMiddleware(index + 1, currentError);
      });
    };

    executeMiddleware(0, err);
  };
}