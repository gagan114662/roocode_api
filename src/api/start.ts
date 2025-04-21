import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { zodErrorHandler, errorLogger, errorResponder, notFoundHandler } from './middleware/error-middleware';
import { addRequestContext } from './middleware/request-context';
import { validateRequestSize, validateApiKey } from './middleware/request-validation';
import { wrapMiddleware } from './utils/middleware';
import { createErrorHandlingMiddleware } from './types/middleware';
import { planningRouter } from './routes/planning';
import jobsRouter from '../routes/jobs';
import { errorReporter } from './core/error-reporter';
import { AppError } from './core/errors';
import { workspaceManager } from './core/workspace';
import { Request } from './types/express';
import { safeGetTiming } from './types/timing';
import { serverConfig, envInfo, serviceConfig } from './config/server';
import { validateConfig } from './core/validation';
import { jobQueueService } from '../services/JobQueueService';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

class ApiServer {
  private app: express.Application;
  private server: any;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Request validation
    this.app.use(wrapMiddleware(validateRequestSize(serverConfig.maxRequestSize)));
    this.app.use(express.json({ limit: serverConfig.maxRequestSize }));
    this.app.use(express.urlencoded({ extended: true, limit: serverConfig.maxRequestSize }));

    // Security headers and CORS
    this.app.use(helmet({
      contentSecurityPolicy: serverConfig.security.enableCSP,
      crossOriginEmbedderPolicy: serverConfig.security.enableCOEP
    }));
    this.app.use(cors({
      origin: serverConfig.cors.origin,
      methods: serverConfig.cors.methods,
      allowedHeaders: serverConfig.cors.allowedHeaders
    }));

    // Request context
    this.app.use(wrapMiddleware(addRequestContext));

    // API key validation for /api routes
    this.app.use(serverConfig.api.basePath, wrapMiddleware(validateApiKey));

    // Request logging
    if (serviceConfig.logging.enabled) {
      this.app.use(morgan(serviceConfig.logging.format));
    }
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: express.Request, res: express.Response) => {
      const timing = safeGetTiming(req as Request);
      
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        ...envInfo,
        timing
      });
    });

    // API routes
    this.app.use(
      `${serverConfig.api.basePath}/${serverConfig.api.version}/planning`,
      planningRouter
    );

    // Jobs routes
    this.app.use(
      `${serverConfig.api.basePath}/${serverConfig.api.version}/jobs`,
      jobsRouter
    );
  }

  private setupErrorHandling(): void {
    const errorMiddleware = createErrorHandlingMiddleware();
    
    // Create error handling chain
    const errorHandler = errorMiddleware.createErrorHandler([
      zodErrorHandler,
      errorLogger,
      errorResponder
    ]);

    // Apply error handling middleware
    this.app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
      errorHandler(err, req as Request, res, next);
    });

    // Handle 404s last
    this.app.use(wrapMiddleware(notFoundHandler));
  }

  public async start(): Promise<void> {
    try {
      // Validate configuration and environment
      validateConfig(serverConfig, serviceConfig);

      // Initialize services
      await this.initializeServices();

      // Start server
      this.server = this.app.listen(serverConfig.port, () => {
        console.log(`API server running on port ${serverConfig.port}`);
        
        if (serverConfig.docs.enabled) {
          console.log(`API documentation available at http://localhost:${serverConfig.port}${serverConfig.docs.path}`);
        }
      });

      // Set up graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private async initializeServices(): Promise<void> {
    try {
      // Set up error reporter config
      errorReporter.setConfig({
        environment: envInfo.environment,
        service: serviceConfig.name,
        version: envInfo.version,
        includeStack: serviceConfig.errorReporting.includeStack
      });

      // Initialize workspace manager
      await workspaceManager.initialize();

      // Add more service initializations here
      await jobQueueService; // This initializes the job queue service

    } catch (error) {
      throw new AppError(
        'Failed to initialize services',
        'INIT_ERROR',
        500,
        { cause: error }
      );
    }
  }

  private setupGracefulShutdown(): void {
    const cleanup = async (signal: string) => {
      console.log(`\nReceived ${signal}. Performing graceful shutdown...`);

      // Close server first
      this.server?.close(() => {
        console.log('Server closed');
      });

      try {
        // Clean up services
        await jobQueueService.cleanup();
        
        process.exit(0);
      } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
      }

      // Force shutdown after timeout
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    // Shutdown hook handlers
    process.on('SIGTERM', () => cleanup('SIGTERM'));
    process.on('SIGINT', () => cleanup('SIGINT'));

    // Uncaught error handlers
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      errorReporter.report(error);
      cleanup('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      errorReporter.report(new Error(String(reason)));
      cleanup('UNHANDLED_REJECTION');
    });
  }
}

// Start the server
const server = new ApiServer();
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default server;