import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ProjectService } from '../services/project.service';
import { jobQueueService } from '../services/JobQueueService';
import { JobData } from '../types/jobs';

const router = Router();
const projectService = new ProjectService();

interface UpdateDepsRequest extends AuthenticatedRequest {
    params: {
        projectId: string;
    };
}

// Update project dependencies
router.post('/:projectId/update-deps', async (req: UpdateDepsRequest, res: Response, next: NextFunction) => {
    try {
        const { projectId } = req.params;

        const jobData: JobData = {
            projectId,
            mode: 'DependencyUpdate',
            options: {
                type: 'dependency-update'
            }
        };

        // Create a job for async processing
        const jobId = await jobQueueService.addJob('update-dependencies', jobData);

        res.json({
            status: 'success',
            data: {
                jobId,
                message: 'Dependency update job queued successfully'
            }
        });
    } catch (error) {
        next(error);
    }
});

// Get dependency update job status
router.get('/:projectId/update-deps/:jobId', async (req: UpdateDepsRequest & { params: { jobId: string } }, res: Response, next: NextFunction) => {
    try {
        const { jobId } = req.params;
        const job = await jobQueueService.getJob(jobId);

        if (!job) {
            res.status(404).json({
                status: 'error',
                message: 'Job not found'
            });
            return;
        }

        res.json({
            status: 'success',
            data: {
                jobId: job.id,
                status: job.status,
                result: job.result,
                progress: job.progress
            }
        });
    } catch (error) {
        next(error);
    }
});

export const updateDepsRouter = router;