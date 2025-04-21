import express from 'express';
import { Request } from '../types/express';

type ExpressMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => void | Promise<void>;

type TypedMiddleware = (
  req: Request,
  res: express.Response,
  next: express.NextFunction
) => void | Promise<void>;

/**
 * Wraps a typed middleware function to work with Express's default types
 */
export function wrapMiddleware(middleware: TypedMiddleware): ExpressMiddleware {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    middleware(req as Request, res, next);
  };
}

/**
 * Helper to create a middleware chain
 */
export function createMiddlewareChain(...middleware: TypedMiddleware[]): ExpressMiddleware {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const executeMiddleware = async (index: number): Promise<void> => {
      if (index === middleware.length) {
        next();
        return;
      }

      try {
        await middleware[index](req as Request, res, (err?: any) => {
          if (err) {
            next(err);
            return;
          }
          executeMiddleware(index + 1);
        });
      } catch (error) {
        next(error);
      }
    };

    executeMiddleware(0);
  };
}

/**
 * Helper to create path-specific middleware
 */
export function routeMiddleware(path: string, ...middleware: TypedMiddleware[]): {
  path: string;
  handler: ExpressMiddleware;
} {
  return {
    path,
    handler: createMiddlewareChain(...middleware)
  };
}

/**
 * Create an Express router with typed middleware support
 */
export function createRouter() {
  const router = express.Router();

  return {
    ...router,
    use: (path: string | TypedMiddleware, ...handlers: TypedMiddleware[]) => {
      if (typeof path === 'string') {
        router.use(path, createMiddlewareChain(...handlers));
      } else {
        router.use(createMiddlewareChain(path, ...handlers));
      }
      return router;
    },
    get: (path: string, ...handlers: TypedMiddleware[]) => {
      router.get(path, createMiddlewareChain(...handlers));
      return router;
    },
    post: (path: string, ...handlers: TypedMiddleware[]) => {
      router.post(path, createMiddlewareChain(...handlers));
      return router;
    },
    put: (path: string, ...handlers: TypedMiddleware[]) => {
      router.put(path, createMiddlewareChain(...handlers));
      return router;
    },
    delete: (path: string, ...handlers: TypedMiddleware[]) => {
      router.delete(path, createMiddlewareChain(...handlers));
      return router;
    }
  };
}