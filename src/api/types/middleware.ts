import { Response, NextFunction } from 'express';
import { Request } from './express';

export type ErrorHandler = (err: unknown, req: Request, res: Response, next: NextFunction) => void;
export type RequestHandler = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

export interface ErrorHandlingMiddleware {
  createErrorHandler: (handlers: ErrorHandler[]) => (err: unknown, req: Request, res: Response, next: NextFunction) => void;
}

export function createErrorHandlingMiddleware(): ErrorHandlingMiddleware {
  return {
    createErrorHandler: (handlers: ErrorHandler[]) => {
      return (err: unknown, req: Request, res: Response, next: NextFunction) => {
        // Execute handlers in sequence
        const executeHandler = (index: number, currentError: unknown): void => {
          if (index >= handlers.length) {
            next(currentError);
            return;
          }

          try {
            handlers[index](currentError, req, res, (nextError?: unknown) => {
              if (nextError) {
                executeHandler(index + 1, nextError);
              } else {
                executeHandler(index + 1, currentError);
              }
            });
          } catch (handlerError) {
            executeHandler(index + 1, handlerError);
          }
        };

        executeHandler(0, err);
      };
    }
  };
}