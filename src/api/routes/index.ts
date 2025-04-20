import { Router } from 'express';
import { modesRouter } from './modes';
import { planRouter } from './plan';
import { executePlanRouter } from './execute-plan';

const router = Router();

// Mount routes
router.use('/modes', modesRouter);
router.use('/projects', planRouter);
router.use('/projects', executePlanRouter);

export default router;