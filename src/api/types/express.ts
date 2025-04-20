import { Request as ExpressRequest, Response, NextFunction } from 'express';
import { RequestTiming } from './timing';

export interface Request extends ExpressRequest {
  startTime: number;
  timing?: RequestTiming;
  user?: {
    id: string;
    roles: string[];
  };
}

export type RequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void> | void;

export type ErrorRequestHandler = (err: unknown, req: Request, res: Response, next: NextFunction) => Promise<void> | void;

export interface RouteConfig {
  path: string;
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  handler: RequestHandler;
  middleware?: RequestHandler[];
}

// Helper type to convert Express middleware to use our Request type
export type TypedRequestHandler<T = any> = (
  req: Request & { body: T },
  res: Response,
  next: NextFunction
) => Promise<void> | void;

// Utility function to wrap async handlers
export const asyncHandler = (handler: RequestHandler): RequestHandler => {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

// Utility function to wrap async error handlers
export const asyncErrorHandler = (handler: ErrorRequestHandler): ErrorRequestHandler => {
  return async (err, req, res, next) => {
    try {
      await handler(err, req, res, next);
    } catch (error) {
      next(error);
    }
  };
};
