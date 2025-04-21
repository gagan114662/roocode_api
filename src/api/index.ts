import express from 'express';
import tasksRouter from '../routes/tasks';
import forecastRouter from '../routes/forecastCost';
import modelRouter from '../routes/modelRoute';
import memoryRouter from '../routes/memory';
import searchRouter from '../routes/search';
import planRouter from '../routes/plan';
import uploadRouter from '../routes/upload';

const app = express();
app.use(express.json());

// Mount routes
app.use('/api/v1/tasks', tasksRouter);
app.use('/api/v1', forecastRouter);
app.use('/api/v1', modelRouter);
app.use('/api/v1', memoryRouter);
app.use('/api/v1', searchRouter);
app.use('/api/v1', planRouter);
app.use('/api/v1', uploadRouter);

// Configure static file serving for uploaded images
app.use('/api/v1/public/uploads', express.static('workspaces', {
  setHeaders: (res, path) => {
    // Only allow images
    if (!path.match(/\.(jpg|jpeg|png|gif|svg)$/i)) {
      return res.status(403).end();
    }
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h cache
  }
}));

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

export default app;
