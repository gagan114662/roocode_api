import express from 'express';
import tasksRouter from '../routes/tasks';
import forecastRouter from '../routes/forecastCost';
import modelRouter from '../routes/modelRoute';
import memoryRouter from '../routes/memory';
import searchRouter from '../routes/search';

const app = express();
app.use(express.json());

// Mount routes
app.use('/api/v1/tasks', tasksRouter);
app.use('/api/v1', forecastRouter);
app.use('/api/v1', modelRouter);
app.use('/api/v1', memoryRouter);
app.use('/api/v1', searchRouter);

export default app;
