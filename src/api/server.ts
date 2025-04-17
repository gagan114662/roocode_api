import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Router } from 'express';
import { authenticate } from './middleware/auth';
import { modesRouter } from './routes/modes';
import { toolsRouter } from './routes/tools';
import { filesRouter } from './routes/files';
import { mcpRouter } from './routes/mcp';
import { chatRouter } from './routes/chat';
import { setupSwagger } from './swagger';

export const createApp = () => {
    const app = express();

    // Security middleware
    app.use(helmet());
    app.use(cors());
    app.use(express.json());

    // Rate limiting
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    });
    app.use(limiter);

    // Set up Swagger documentation
    setupSwagger(app);

    // Authentication middleware
    app.use('/api/v1', authenticate);

    // API routes
    const apiRouter = Router();
    app.use('/api/v1', apiRouter);

    // Mount route handlers
    apiRouter.use('/modes', modesRouter);
    apiRouter.use('/tools', toolsRouter);
    apiRouter.use('/files', filesRouter);
    apiRouter.use('/mcp', mcpRouter);
    apiRouter.use('/chat', chatRouter);

    // Error handling
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
        console.error(err.stack);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    });

    // 404 handler
    app.use((req: express.Request, res: express.Response) => {
        res.status(404).json({
            status: 'error',
            message: 'Resource not found'
        });
    });

    return app;
};

const PORT = process.env.PORT || 3000;

export function startServer() {
    const app = createApp();
    const server = app.listen(PORT, () => {
        console.log(`API server running on port ${PORT}`);
        console.log(`API documentation available at http://localhost:${PORT}/api-docs`);
    });

    // Add app instance to server for testing
    return Object.assign(server, { app });
}