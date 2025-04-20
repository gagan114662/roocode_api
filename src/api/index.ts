import express from 'express';
import tasksRouter from '../routes/tasks';
import forecastRouter from '../routes/forecastCost';

const app = express();
app.use(express.json());

// Mount routes
app.use('/api/v1/tasks', tasksRouter);
app.use('/api/v1', forecastRouter);

export default app;
