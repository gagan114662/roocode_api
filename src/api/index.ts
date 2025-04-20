import express from 'express';
import tasksRouter from '../routes/tasks';

const app = express();
app.use(express.json());

// Mount routes
app.use('/api/v1/tasks', tasksRouter);

export default app;
