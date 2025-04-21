import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { projectsRouter } from '../routes/projects';
import { applyCustomModes } from '../config/applyModes';
import { modes } from '../config/roocodeModes';

// Create Express app
const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());

// Apply RooCode modes
applyCustomModes(app, modes);

// Routes
app.use('/projects', projectsRouter);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});

// Export app
export default app;
