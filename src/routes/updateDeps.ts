import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ProjectService } from '../services/project.service';
import { jobQueueService } from '../services/JobQueueService';
import { JobData } from '../types/jobs';
import { openai } from '../api/providers/openaiProvider';
import { modes } from '../config/roocodeModes';

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
        const { immediate } = req.query;

        if (immediate) {
            // Handle immediate execution
            let pkgJson;
            try {
                pkgJson = await projectService.readFile(projectId, 'package.json');
            } catch (err) {
                return res.status(404).json({
                    status: 'error',
                    code: 'PACKAGE_JSON_NOT_FOUND',
                    message: 'Could not find package.json in the project'
                });
            }

            const prompt = modes.dependencyUpdate.promptTemplate.replace(
                '{{packageJson}}',
                pkgJson
            );

            const completion = await openai.chat.completions.create({
                model: modes.dependencyUpdate.model,
                messages: [
                    { role: 'system', content: 'You are a precise patch generator.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0
            });

            const diff = completion.choices[0].message.content;

            try {
                await projectService.applyPatch(projectId, diff);
                await projectService.commit(projectId, 'chore: update dependencies');
                return res.status(200).json({
                    status: 'success',
                    data: { diff }
                });
            } catch (err) {
                return res.status(400).json({
                    status: 'error',
                    code: 'PATCH_FAILED',
                    message: 'Failed to apply dependency updates',
                    details: err.message
                });
            }
        }

        // Queue for async processing
        const jobData: JobData = {
            projectId,
            mode: 'DependencyUpdate',
            options: {
                type: 'dependency-update'
            }
        };

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
