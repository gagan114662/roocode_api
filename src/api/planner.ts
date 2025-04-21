import { Anthropic } from "@anthropic-ai/sdk"
import { SingleCompletionHandler } from "."
import { ApiStream } from "./transform/stream"
import { CodegenResponse } from "./types"

export interface PlanStep {
    id: string;
    description: string;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    tasks: string[];
    files: string[];
}

export interface Plan {
    steps: PlanStep[];
    context: string;
}

export class PlannerAgent {
    private provider: SingleCompletionHandler;

    constructor(provider: SingleCompletionHandler) {
        this.provider = provider;
    }

    async createPlan(prompt: string): Promise<Plan> {
        // Generate planning system prompt
        const systemPrompt = `You are a planning agent that breaks down complex programming tasks into clear, actionable steps.
For the given task, create a plan with the following structure:
1. First, understand and analyze the requirements
2. Break down the task into clear, sequential steps
3. For each step, specify:
   - A clear description of what needs to be done
   - Specific tasks to accomplish
   - List of files that will be created or modified
   - Any dependencies on other steps
   - Expected outcome

Format the response as a numbered list of steps.
For each step, include a list of tasks prefixed with "Tasks:" and a list of files prefixed with "Files:".
Do not write any code - focus only on planning the approach.`;

        // Stream the planning response
        const messages: Anthropic.Messages.MessageParam[] = [
            { role: "user", content: prompt }
        ];

        let planText = "";
        for await (const chunk of this.provider.createMessage(systemPrompt, messages)) {
            if (chunk.type === "text") {
                planText += chunk.text;
            }
        }

        // Parse the plan text into structured steps
        const steps = this.parsePlanSteps(planText);
        
        return {
            steps,
            context: prompt
        };
    }

    private parsePlanSteps(planText: string): PlanStep[] {
        // Split on numbered lines and parse into steps
        const stepLines = planText.split(/\n\d+\.\s+/).filter(line => line.trim());
        
        return stepLines.map((step, index) => {
            const lines = step.split('\n');
            const description = lines[0].trim();
            
            // Extract tasks (lines between "Tasks:" and "Files:")
            const tasksStart = lines.findIndex(l => l.trim().startsWith('Tasks:'));
            const filesStart = lines.findIndex(l => l.trim().startsWith('Files:'));
            const tasks = tasksStart !== -1
                ? lines.slice(tasksStart + 1, filesStart !== -1 ? filesStart : undefined)
                    .map(l => l.trim())
                    .filter(l => l.startsWith('-'))
                    .map(l => l.slice(1).trim())
                : [];

            // Extract files
            const files = filesStart !== -1
                ? lines.slice(filesStart + 1)
                    .map(l => l.trim())
                    .filter(l => l.startsWith('-'))
                    .map(l => l.slice(1).trim())
                : [];

            return {
                id: `step-${index + 1}`,
                description,
                status: 'pending',
                tasks,
                files
            };
        });
    }

    async *streamPlanExecution(plan: Plan): AsyncGenerator<CodegenResponse> {
        const systemPrompt = `You are an expert programmer implementing a solution according to a specific plan.
Current task context: ${plan.context}

You are currently executing the plan step by step. Each step should be implemented carefully and methodically.
Before starting, analyze the requirements and dependencies of each step.`;

        for (const step of plan.steps) {
            // Update step status
            step.status = 'in-progress';
            yield { type: 'step-update', step };

            // Generate step-specific prompt
            const stepPrompt = `Executing step: ${step.description}\n\nProvide the implementation for this step.`;
            const messages: Anthropic.Messages.MessageParam[] = [
                { role: "user", content: stepPrompt }
            ];

            // Stream step execution
            try {
                for await (const chunk of this.provider.createMessage(systemPrompt, messages)) {
                    yield chunk;
                }
                step.status = 'completed';
            } catch (error) {
                step.status = 'failed';
                yield { type: 'error', step, error: error instanceof Error ? error : new Error('Unknown error') };
            }

            yield { type: 'step-update', step };
        }
    }
}