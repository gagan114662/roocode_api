import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ProjectService } from '../services/project.service';
import { JobQueueService } from '../services/JobQueueService';
import { createPlanExecutor } from '../services/planner/PlanExecutor';
import { PlanTree } from '../types/plan';

const router = Router();
const projectService = new ProjectService();
const jobQueueService = new JobQueueService();
const planExecutor = createPlanExecutor(jobQueueService, projectService);

interface ExecutePlanRequest extends AuthenticatedRequest {
  params: {
    projectId: string;
    planId?: string;
  };
}

// Execute a plan by ID
router.post('/:projectId/execute-plan/:planId', async (req: ExecutePlanRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId, planId } = req.params;

    if (!planId) {
      res.status(400).json({
        status: 'error',
        message: 'Plan ID is required'
      });
      return;
    }

    // Load plan from project
    const planJson = await projectService.readFile(projectId, 'plan.json');
    if (!planJson) {
      res.status(404).json({
        status: 'error',
        message: 'No plan found for this project'
      });
      return;
    }

    try {
      const plan = JSON.parse(planJson) as PlanTree;
      
      // Verify plan ID matches
      if (plan.planId !== planId) {
        res.status(400).json({
          status: 'error',
          message: 'Plan ID mismatch'
        });
        return;
      }

      // Execute plan
      const executionHistory = await planExecutor.executeTree(plan, projectId);

      res.json({
        status: 'success',
        data: executionHistory
      });
    } catch (error) {
      if (error instanceof SyntaxError) {
        res.status(500).json({
          status: 'error',
          message: 'Failed to parse plan file'
        });
      } else {
        next(error);
      }
    }
  } catch (error) {
    next(error);
  }
});

// Get execution history for a plan
router.get('/:projectId/execute-plan/:planId/history', async (req: ExecutePlanRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId, planId } = req.params;

    if (!planId) {
      res.status(400).json({
        status: 'error',
        message: 'Plan ID is required'
      });
      return;
    }

    // Try to get history from memory first
    let history = planExecutor.getExecutionHistory(planId);

    // If not in memory, try to load from file
    if (!history) {
      history = await planExecutor.loadExecutionHistory(projectId, planId);
    }

    if (!history) {
      res.status(404).json({
        status: 'error',
        message: 'No execution history found for this plan'
      });
      return;
    }

    res.json({
      status: 'success',
      data: history
    });
  } catch (error) {
    next(error);
  }
});

export const executePlanRouter = router;