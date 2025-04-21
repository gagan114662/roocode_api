import { Router, Response, NextFunction } from 'express';
import { RequestHandler } from 'express-serve-static-core';
import { AuthenticatedRequest, authorize } from '../middleware/auth';
import { planService } from '../services/plan-service';
import { z } from 'zod';

const router = Router();

const createPlanSchema = z.object({
  description: z.string(),
  projectId: z.string()
});

const executePlanSchema = z.object({
  projectId: z.string()
});

type CreatePlanRequest = z.infer<typeof createPlanSchema>;
type ExecutePlanRequest = z.infer<typeof executePlanSchema>;

// Create a new plan from description
const createPlan: RequestHandler = async (
  req: AuthenticatedRequest & { body: CreatePlanRequest },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = createPlanSchema.parse(req.body);
    const { description, projectId } = validatedData;

    const plan = await planService.createPlan(description, projectId);
    res.json({
      status: 'success',
      data: { plan }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid request data',
        errors: error.errors
      });
      return;
    }
    next(error);
  }
};

// Execute an existing plan
const executePlan: RequestHandler = async (
  req: AuthenticatedRequest & { body: ExecutePlanRequest },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = executePlanSchema.parse(req.body);
    const { projectId } = validatedData;

    const results = await planService.executePlan(projectId);
    res.json({
      status: 'success',
      data: { results }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid request data',
        errors: error.errors
      });
      return;
    }
    next(error);
  }
};

// Register routes with middleware
router.post('/create', authorize(['write']), createPlan);
router.post('/execute', authorize(['write']), executePlan);

export const planningRouter = router;