import { Router } from 'express';
import { PlannerAgent } from '../services/llm/PlannerAgent';
import { ProjectService } from '../services/project/ProjectService';
import { MemoryService } from '../services/memory/MemoryService';
import { VectorContextService } from '../services/context/VectorContextService';

const router = Router();

/**
 * Initialize required services
 */
const projectService = new ProjectService();
const memoryService = new MemoryService();
const vectorService = new VectorContextService();

/**
 * Execute a planning task
 */
router.post('/projects/:projectId/plan', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { prompt, history = [], responseId } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing required field: prompt' });
    }

    // Initialize planner for this project
    const planner = new PlannerAgent(
      projectId,
      projectService,
      memoryService,
      vectorService
    );

    // Execute plan
    const result = await planner.plan(prompt, history, responseId);

    res.json({
      projectId,
      prompt,
      ...result,
      metadata: {
        timestamp: new Date().toISOString(),
        executionTimeMs: result.functions?.reduce(
          (total, fn) => total + (fn.result?.duration || 0),
          0
        ) || 0,
        functionCallCount: result.functions?.length || 0
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * List available functions for a project
 */
router.get('/projects/:projectId/functions', async (_req, res) => {
  const { BUILT_IN_FUNCTIONS } = await import('../services/llm/functions');
  res.json({ functions: BUILT_IN_FUNCTIONS });
});

/**
 * Validate function arguments
 */
router.post('/projects/:projectId/functions/validate', async (req, res) => {
  const { name, args } = req.body;

  if (!name || !args) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['name', 'args']
    });
  }

  const { validateFunctionArgs } = await import('../services/llm/functions');
  const errors = validateFunctionArgs(name, args);

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  res.json({ valid: true });
});

export default router;
