import express from 'express';
import { z } from 'zod';
import { jobQueueService } from '../services/JobQueueService';

const router = express.Router();

// Validation schemas
const createJobSchema = z.object({
  name: z.string(),
  data: z.object({
    projectId: z.string().optional(),
    prompt: z.string().optional(),
    mode: z.string().optional(),
    options: z.record(z.any()).optional()
  })
});

/**
 * @route POST /jobs
 * @desc Create a new job
 */
router.post('/', async (req, res) => {
  try {
    const validation = createJobSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const { name, data } = validation.data;
    const jobId = await jobQueueService.addJob(name, data);

    res.status(201).json({ id: jobId });
  } catch (error) {
    console.error('Failed to create job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

/**
 * @route GET /jobs/:id
 * @desc Get job status by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const job = await jobQueueService.getJob(id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Failed to get job:', error);
    res.status(500).json({ error: 'Failed to get job' });
  }
});

/**
 * @route DELETE /jobs/:id
 * @desc Remove a job by ID
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await jobQueueService.removeJob(id);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to remove job:', error);
    res.status(500).json({ error: 'Failed to remove job' });
  }
});

/**
 * @route GET /jobs/queue/status
 * @desc Get queue status
 */
router.get('/queue/status', async (_req, res) => {
  try {
    const status = await jobQueueService.getQueueStatus();
    res.json(status);
  } catch (error) {
    console.error('Failed to get queue status:', error);
    res.status(500).json({ error: 'Failed to get queue status' });
  }
});

export default router;