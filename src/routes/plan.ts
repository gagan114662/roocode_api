import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ProjectService } from '../services/project.service';
import { plannerAgent } from '../services/planner/PlannerAgent';
import { PlanTree } from '../types/plan';

const router = Router();
const projectService = new ProjectService();

interface PlanRequest extends AuthenticatedRequest {
    params: {
        projectId: string;
    };
    body: {
        prompt: string;
    };
}

// Generate and store project plan
router.post('/:projectId/plan', async (req: PlanRequest, res: Response, next: NextFunction) => {
    try {
        const { projectId } = req.params;
        const { prompt } = req.body;

        if (!prompt) {
            res.status(400).json({
                status: 'error',
                message: 'Prompt is required'
            });
            return;
        }

        // Generate plan tree
        const plan = await plannerAgent.createPlanTree(prompt);

        // Save plan to project
        await projectService.writeFile(
            projectId,
            'plan.json',
            JSON.stringify(plan, null, 2)
        );

        // Commit plan
        await projectService.commit(projectId, 'feat: add project plan structure');

        res.json({
            status: 'success',
            data: plan
        });

    } catch (error) {
        next(error);
    }
});

// Get project plan
router.get('/:projectId/plan', async (req: PlanRequest, res: Response, next: NextFunction) => {
    try {
        const { projectId } = req.params;

        const planJson = await projectService.readFile(projectId, 'plan.json');
        if (!planJson) {
            res.status(404).json({
                status: 'error',
                message: 'No plan found for this project'
            });
            return;
        }

        const plan = JSON.parse(planJson) as PlanTree;
        res.json({
            status: 'success',
            data: plan
        });

    } catch (error) {
        next(error);
    }
});

export const planRouter = router;