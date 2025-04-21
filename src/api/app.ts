import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { codegenRouter } from './routes/codegen';
import { projectsRouter } from './routes/projects';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/generate', codegenRouter);
app.use('/api/projects', projectsRouter);

export { app };