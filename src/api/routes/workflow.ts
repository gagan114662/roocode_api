import { Router, Response, NextFunction } from 'express';
import { RequestHandler } from 'express-serve-static-core';
import { AuthenticatedRequest, authorize } from '../middleware/auth';
import { workflowService } from '../services/workflow-service';

const router = Router();

interface WorkflowRequest {
    requirements: string;
    projectType: string;
    projectDir: string;
}

interface TypedRequestWithBody<T> extends AuthenticatedRequest {
    body: T;
}

// Start a new project workflow
const startWorkflow: RequestHandler = async (
    req: TypedRequestWithBody<WorkflowRequest>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { requirements, projectType, projectDir } = req.body;

        if (!requirements || !projectType || !projectDir) {
            res.status(400).json({
                status: 'error',
                message: 'Requirements, project type, and project directory are required'
            });
            return;
        }

        const result = await workflowService.startProject(requirements, projectType, projectDir);

        res.json({
            status: 'success',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// Stop an active workflow
const stopWorkflow: RequestHandler = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        workflowService.stopWorkflow();

        res.json({
            status: 'success',
            message: 'Workflow stopped successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
};

// Register routes with middleware
router.post('/start', authorize(['write']), startWorkflow);
router.post('/stop', authorize(['write']), stopWorkflow);

export const workflowRouter = router;