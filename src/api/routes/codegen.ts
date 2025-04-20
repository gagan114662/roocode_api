import { Router, Response, NextFunction } from 'express';
import { RequestHandler } from 'express-serve-static-core';
import { AuthenticatedRequest, authorize } from '../middleware/auth';
import { PlannerAgent, PlanStep } from '../planner';
import { ApiHandlerOptions, ApiProvider } from '../../shared/api';
import { CodegenResponse } from '../types';
import { ProjectService } from '../../services/project/ProjectService';
import { qaService, QAResult } from '../../services/qa/QAService';

const router = Router();

interface CodegenRequest {
    prompt: string;
    planFirst?: boolean;
    model?: string;
    provider?: ApiProvider;
    projectId?: string;
    runQA?: boolean;
}

interface TypedRequestWithBody<T> extends AuthenticatedRequest {
    body: T;
}

export const generateCode: RequestHandler = async (
    req: TypedRequestWithBody<CodegenRequest>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const { prompt, planFirst = false, provider = 'openrouter', model, projectId, runQA = false } = req.body;

    if (!prompt) {
        res.status(400).json({
            status: 'error',
            message: 'Prompt is required'
        });
        return;
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const writeResponse = (response: CodegenResponse) => {
        res.write(`data: ${JSON.stringify(response)}\n\n`);
    };

    try {
        // Configure provider based on request
        const options: ApiHandlerOptions = {
            openRouterModelId: model,
        };

        const llmProvider = await (async () => {
            const { buildApiHandler } = await import('../providers');
            return buildApiHandler(options);
        })();

        if (planFirst) {
            const planner = new PlannerAgent(llmProvider);
            const plan = await planner.createPlan(prompt);

            // Send plan metadata
            writeResponse({
                type: 'plan',
                plan
            });

            let projectService: ProjectService | undefined;
            if (projectId) {
                projectService = new ProjectService(projectId);
                await projectService.initialize();
            }

            // Execute plan and stream results
            for await (const chunk of planner.streamPlanExecution(plan)) {
                writeResponse(chunk);

                // After each step is completed, commit the changes if in a project
                if (projectService &&
                    chunk.type === 'text' &&
                    typeof chunk.text === 'string' &&
                    chunk.text.startsWith('✅ Completed step')) {
                    // Extract step info from the current plan step
                    const stepId = chunk.text.match(/step\s+(\S+)/)?.[1];
                    const step = plan.steps.find(s => s.id === stepId);
                    
                    if (step) {
                        const commitMsg = `${step.description}\n\nFiles modified:\n${step.files.join('\n')}`;
                        await projectService.commit(commitMsg);
                    }
                }
            }
        } else {
            // Direct code generation without planning
            const systemPrompt = `You are a code implementation expert. Provide code changes that match the project's style and best practices.
When implementing a solution:
1. First analyze the requirements carefully
2. Consider edge cases and potential issues
3. Use modern best practices and patterns
4. Follow the project's existing style and conventions
5. Include clear comments explaining complex logic`;

            const stream = llmProvider.createMessage(
                systemPrompt,
                [{ role: 'user', content: prompt }]
            );

            for await (const chunk of stream) {
                writeResponse(chunk);
            }
        }

        // Run QA checks if requested and projectId is provided
        if (runQA && projectId) {
            try {
                // Initialize project service if not already done
                let projectService: ProjectService;
                if (!planFirst) {
                    projectService = new ProjectService(projectId);
                    await projectService.initialize();
                } else {
                    // Project service was already initialized in the plan execution
                    projectService = new ProjectService(projectId);
                    await projectService.initialize();
                }

                const projectPath = await projectService.getProjectPath();
                
                // Run QA checks
                writeResponse({
                    type: 'text',
                    text: '🔍 Running QA checks...'
                });
                
                const qaResults = await qaService.runAll(projectPath);
                
                // Send QA results
                writeResponse({
                    type: 'qa-results',
                    qaResults
                });
                
                // Summarize QA results
                const passedChecks = qaResults.filter(result => result.success).length;
                const totalChecks = qaResults.length;
                const summary = `✅ ${passedChecks}/${totalChecks} checks passed`;
                
                writeResponse({
                    type: 'text',
                    text: summary
                });
            } catch (error) {
                console.error('QA check error:', error);
                writeResponse({
                    type: 'error',
                    message: 'Failed to run QA checks: ' + (error instanceof Error ? error.message : String(error))
                });
            }
        }

        writeResponse({ type: 'text', text: '[DONE]' });
    } catch (error) {
        console.error('Code generation error:', error);
        writeResponse({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    } finally {
        res.end();
    }
};

// Register routes with middleware
router.post('/generate', authorize(['write']), generateCode);

export const codegenRouter = router;