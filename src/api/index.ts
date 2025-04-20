import express from 'express';
import tasksRouter from '../routes/tasks';
import forecastRouter from '../routes/forecastCost';
import modelRouter from '../routes/modelRoute';

const app = express();
app.use(express.json());

// Mount routes
app.use('/api/v1/tasks', tasksRouter);
app.use('/api/v1', forecastRouter);
app.use('/api/v1', modelRouter);

export default app;
