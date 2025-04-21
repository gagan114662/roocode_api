import express from 'express';
import cors from 'cors';
import { projectsRouter } from '../routes/projects';

/**
 * Creates a test server with minimal configuration for integration testing
 * @returns Express application instance
 */
export function createTestServer(): express.Application {
  const app = express();
  
  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cors());
  
  // Mount routes
  app.use('/projects', projectsRouter);
  
  // Simple error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error in test server:', err);
    res.status(err.status || 500).json({
      status: 'error',
      message: err.message || 'Internal Server Error'
    });
  });
  
  return app;
}