import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { projectsRouter } from '../routes/projects';
import { updateDepsRouter } from '../routes/updateDeps';
import { metricsRouter } from '../routes/metrics';
import { planRouter } from '../routes/plan';
import { executePlanRouter } from '../routes/executePlan';

// Create Express app
const app = express();

// Apply middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Mount routers
app.use('/projects', projectsRouter);
app.use('/projects', updateDepsRouter);
app.use('/projects', planRouter); // Plan generation and retrieval
app.use('/projects', executePlanRouter); // Plan execution
app.use('/', metricsRouter); // Metrics endpoint at /metrics

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
        status: 'error',
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

export default app;
