import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest, authorize } from '../middleware/auth';
import { openai } from '../providers/openaiProvider';
import { projectService } from '../services/projectService';
import { modes } from '../core/modes';
import { Plan, TaskResult } from '../types/project';
import { z } from 'zod';
import EventEmitter from 'events';
import { plannerLogger } from '../utils/plannerLogger';

const progressEmitter = new EventEmitter();

const executeRequestSchema = z.object({
    taskIds: z.array(z.string()).optional() // Optional array of task IDs to execute
});

interface ExecuteRequestBody {
    taskIds?: string[];
}

const router = Router();

// GET /projects/:id/plan/progress
router.get('/:id/plan/progress', authorize(['read']), (req: AuthenticatedRequest, res: Response) => {
    const projectId = req.params.id;
    
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const listener = (data: any) => {
        if (data.projectId === projectId) {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
    };

    progressEmitter.on('progress', listener);

    // Clean up on client disconnect
    req.on('close', () => {
        progressEmitter.removeListener('progress', listener);
    });
});

// POST /projects/:id/execute-plan
router.post('/:id/execute-plan', authorize(['write']), async (req: AuthenticatedRequest<ExecuteRequestBody>, res: Response, next: NextFunction) => {
    try {
        plannerLogger.info('Starting plan execution', { 
            userId: req.user?.id,
            projectId: req.params.id,
            taskIds: req.body.taskIds
        });

        const projectId = req.params.id;
        const validatedData = executeRequestSchema.parse(req.body);
        
        // Read and validate the saved plan
        const planContent = await projectService.readFile(projectId, 'plan.json');
        let plan: Plan;
        try {
            plan = JSON.parse(planContent);
        } catch (e) {
            plannerLogger.error('Invalid plan.json format', { projectId });
            throw new Error('Invalid plan.json format');
        }

        // Filter tasks if specific ones are requested
        const tasksToExecute = validatedData.taskIds 
            ? plan.tasks.filter(t => validatedData.taskIds?.includes(t.id))
            : plan.tasks;

        if (validatedData.taskIds && tasksToExecute.length !== validatedData.taskIds.length) {
            plannerLogger.error('One or more requested task IDs not found in plan', { projectId, taskIds: validatedData.taskIds });
            throw new Error('One or more requested task IDs not found in plan');
        }

        // Update plan status
        plan.metadata.status = 'in_progress';
        await projectService.writeFile(projectId, 'plan.json', JSON.stringify(plan, null, 2));

        // Send initial response
        res.json({
            status: 'success',
            message: 'Plan execution started',
            data: {
                tasksToExecute: tasksToExecute.length,
                progressEndpoint: `/projects/${projectId}/plan/progress`
            }
        });

        // Execute tasks in background
        executeTasks(projectId, tasksToExecute).catch(error => {
            plannerLogger.error('Error executing plan', { projectId, error: error instanceof Error ? error.message : String(error) });
            console.error('Error executing plan:', error);
            progressEmitter.emit('progress', {
                projectId,
                type: 'error',
                error: error.message
            });
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
        plannerLogger.error('Unexpected error during plan execution', { error: error instanceof Error ? error.message : String(error) });
        next(error);
    }
});

async function executeTasks(projectId: string, tasks: Plan['tasks']) {
    const results: TaskResult[] = [];
    let currentTask: TaskResult | undefined;

    try {
        // Execute tasks in sequence
        for (const task of tasks) {
            currentTask = {
                taskId: task.id,
                status: 'in_progress',
                output: 'Task execution in progress'
            } satisfies TaskResult;
            progressEmitter.emit('progress', {
                projectId,
                type: 'task-start',
                task: currentTask
            });

            try {
                plannerLogger.info('Starting task execution', { projectId, taskId: task.id, taskType: task.ownerMode });

                // Switch to appropriate mode for task
                await modes.switch(task.ownerMode);

                const completion = await openai.chat.completions.create({
                    model: 'gpt-4',
                    messages: [
                        {
                            role: 'system',
                            content: `You are the ${task.ownerMode} agent. Implement the following task according to the project plan.`
                        },
                        {
                            role: 'user',
                            content: task.description
                        }
                    ]
                });

                const output = completion.choices[0]?.message?.content;
                if (!output) {
                    plannerLogger.error('No output from LLM', { projectId, taskId: task.id });
                    throw new Error('No output from LLM');
                }

                // Handle the output based on mode
                if (task.ownerMode.toLowerCase() === 'code') {
                    await projectService.applyPatch(projectId, output);
                } else {
                    const filename = `${task.id}-${task.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
                    await projectService.writeFile(projectId, filename, output);
                }

                await projectService.commit(projectId, `Task ${task.id}: ${task.title}`);

                // Update task result with output and status
                const completedTask: TaskResult = {
                    ...currentTask,
                    status: 'completed',
                    output: output // Store actual output from LLM
                };
                
                results.push(completedTask);
                currentTask = completedTask;

                plannerLogger.info('Task execution completed', { projectId, taskId: task.id });

                progressEmitter.emit('progress', {
                    projectId,
                    type: 'task-complete',
                    task: currentTask
                });

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                
                // Update task result with error
                const failedTask: TaskResult = {
                    ...currentTask,
                    status: 'failed',
                    output: 'Task execution failed',
                    error: errorMessage
                };

                results.push(failedTask);
                currentTask = failedTask;

                plannerLogger.error('Task execution failed', { projectId, taskId: task.id, error: errorMessage });

                progressEmitter.emit('progress', {
                    projectId,
                    type: 'task-error',
                    task: currentTask
                });

                throw new Error(`Task ${task.id} failed: ${errorMessage}`);
            }
        }

        // Update plan status to completed if all tasks are done
        const plan = JSON.parse(await projectService.readFile(projectId, 'plan.json'));
        plan.metadata.status = 'completed';
        await projectService.writeFile(projectId, 'plan.json', JSON.stringify(plan, null, 2));

        plannerLogger.info('Plan execution completed', { projectId });

        progressEmitter.emit('progress', {
            projectId,
            type: 'complete',
            results
        });

    } catch (error) {
        // Update plan status to indicate failure
        const plan = JSON.parse(await projectService.readFile(projectId, 'plan.json'));
        plan.metadata.status = 'failed';
        await projectService.writeFile(projectId, 'plan.json', JSON.stringify(plan, null, 2));

        plannerLogger.error('Plan execution failed', { projectId, error: error instanceof Error ? error.message : String(error) });

        throw error;
    }
}

export const executePlanRouter = router;