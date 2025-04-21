import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest, authorize } from '../middleware/auth';
import { openai } from '../providers/openaiProvider';
import { projectService } from '../services/projectService';
import { Plan } from '../types/project';
import { z } from 'zod';
import { plannerLogger } from '../utils/plannerLogger';

const planRequestSchema = z.object({
    description: z.string().min(1, "Description is required")
});

interface PlanRequestBody {
    description: string;
}

const router = Router();

// POST /projects/:id/plan
router.post('/:id/plan', authorize(['write']), async (req: AuthenticatedRequest<PlanRequestBody>, res: Response, next: NextFunction) => {
    try {
        plannerLogger.info('Starting to create a plan', { userId: req.user?.id, projectId: req.params.id });

        // Validate request body
        const validatedData = planRequestSchema.parse(req.body);
        const { description } = validatedData;
        const projectId = req.params.id;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: `You are the PM agent. Break down the feature description into a structured JSON plan that matches this TypeScript interface:

interface Plan {
    tasks: Array<{
        id: string;
        title: string;
        description: string;
        ownerMode: 'pm' | 'architect' | 'code' | 'debug';
        dependencies?: string[];
    }>;
    metadata: {
        createdAt: string;
        status: 'pending' | 'in_progress' | 'completed';
    };
}`
                },
                {
                    role: 'user',
                    content: description
                }
            ]
        });

        // Validate LLM response
        const content = completion.choices[0]?.message?.content;
        if (!content) {
            plannerLogger.error('Failed to generate plan: No content in LLM response', { projectId });
            throw new Error('Failed to generate plan: No content in LLM response');
        }

        let plan: Plan;
        try {
            plan = JSON.parse(content);
        } catch (e) {
            plannerLogger.error('Failed to parse plan: Invalid JSON in LLM response', { projectId, content });
            throw new Error('Failed to parse plan: Invalid JSON in LLM response');
        }

        // Set initial metadata
        plan.metadata = {
            createdAt: new Date().toISOString(),
            status: 'pending'
        };

        // Save plan in workspace
        await projectService.writeFile(projectId, 'plan.json', JSON.stringify(plan, null, 2));
        await projectService.commit(projectId, 'Add project plan');

        plannerLogger.info('Plan created and saved successfully', { projectId, plan });

        res.json({
            status: 'success',
            data: { plan }
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            plannerLogger.error('Invalid request data', { errors: error.errors });
            res.status(400).json({
                status: 'error',
                message: 'Invalid request data',
                errors: error.errors
            });
            return;
        }
        plannerLogger.error('Unexpected error occurred', { 
            error: error instanceof Error ? error.message : String(error),
            userId: req.user?.id,
            projectId: req.params.id
        });
        next(error);
    }
});

export const planRouter = router;