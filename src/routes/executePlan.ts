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
    jobId?: string;
  };
}

// Execute a plan by ID (async)
router.post('/:projectId/execute-plan/:planId', async (req: ExecutePlanRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId, planId } = req.params;

    if (!planId) {
      return res.status(400).json({
        status: 'error',
        code: 'MISSING_PLAN_ID',
        message: 'Plan ID is required'
      });
    }

    // Load plan from project
    const planJson = await projectService.readFile(projectId, 'plan.json');
    if (!planJson) {
      return res.status(404).json({
        status: 'error',
        code: 'PLAN_NOT_FOUND',
        message: 'No plan found for this project'
      });
    }

    try {
      const plan = JSON.parse(planJson) as PlanTree;
      
      // Verify plan ID matches
      if (plan.planId !== planId) {
        return res.status(400).json({
          status: 'error',
          code: 'PLAN_ID_MISMATCH',
          message: 'Plan ID mismatch'
        });
      }

      // Add job to queue
      const jobId = await jobQueueService.addJob('execute-plan', {
        projectId,
        options: {
          planId
        }
      });

      // Return 202 Accepted with job ID
      return res.status(202).json({
        status: 'accepted',
        data: {
          jobId,
          message: 'Plan execution started',
          links: {
            status: `/projects/${projectId}/execute-plan/${planId}/history`,
            cancel: `/projects/${projectId}/execute-plan/${planId}`
          }
        }
      });
    } catch (error) {
      if (error instanceof SyntaxError) {
        return res.status(500).json({
          status: 'error',
          code: 'INVALID_PLAN_FORMAT',
          message: 'Failed to parse plan file'
        });
      }
      next(error);
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
      return res.status(400).json({
        status: 'error',
        code: 'MISSING_PLAN_ID',
        message: 'Plan ID is required'
      });
    }

    // Try to get history from memory first
    let history = planExecutor.getExecutionHistory(planId);

    // If not in memory, try to load from file
    if (!history) {
      history = await planExecutor.loadExecutionHistory(projectId, planId);
    }

    if (!history) {
      return res.status(404).json({
        status: 'error',
        code: 'HISTORY_NOT_FOUND',
        message: 'No execution history found for this plan'
      });
    }

    return res.json({
      status: 'success',
      data: history
    });
  } catch (error) {
    next(error);
  }
});

// Cancel plan execution
router.delete('/:projectId/execute-plan/:planId', async (req: ExecutePlanRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId, planId } = req.params;

    if (!planId) {
      return res.status(400).json({
        status: 'error',
        code: 'MISSING_PLAN_ID',
        message: 'Plan ID is required'
      });
    }

    // Mark plan as cancelled in execution history
    const cancelled = planExecutor.cancelExecution(planId);

    if (!cancelled) {
      return res.status(404).json({
        status: 'error',
        code: 'PLAN_NOT_FOUND_OR_COMPLETED',
        message: 'Plan not found or already completed/failed'
      });
    }

    // Remove any pending jobs for this plan
    const removedCount = await jobQueueService.removeJobsByFilter({
      name: 'execute-task',
      data: { planId }
    });

    return res.status(200).json({
      status: 'success',
      data: {
        message: `Plan execution cancelled. Removed ${removedCount} pending tasks.`
      }
    });
  } catch (error) {
    next(error);
  }
});

export const executePlanRouter = router;