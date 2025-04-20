import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { PlanTree, PlanTask, PlanParent } from '../../types/plan';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const PLAN_EXAMPLE = `{
  "planId": "uuid",
  "parent": { "id": 0, "title": "Build User-Profile", "description": "Create user profile system", "ownerMode":"PM" },
  "tasks": [
    { "id": 1, "parentId": 0, "title": "DB Schema", "description":"Define tables", "ownerMode":"Architect" },
    { "id": 2, "parentId": 0, "title": "Models", "description":"Implement ORM models", "ownerMode":"Code" },
    { "id": 3, "parentId": 2, "title": "Model Tests", "description":"Write unit tests for models", "ownerMode":"TestGen" }
  ]
}`;

const PLAN_PROMPT = `You are a Project Manager AI that creates detailed, hierarchical project plans.
Generate a plan following this JSON schema EXACTLY:

${PLAN_EXAMPLE}

Key requirements:
- Parent task has id=0 and ownerMode="PM"
- Each subtask must have a valid parentId linking to parent task
- Tasks must be assigned appropriate ownerModes: PM, Architect, Code, or TestGen
- Include testing tasks for major components

Task: Generate a plan for: `;

export class PlannerAgent {
    async createPlanTree(prompt: string): Promise<PlanTree> {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: PLAN_PROMPT
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.2
        });

        const content = completion.choices[0].message.content;
        if (!content) {
            throw new Error('Failed to generate plan: Empty response');
        }

        try {
            const plan = JSON.parse(content);
            
            // Validate plan structure
            if (!plan.parent || !plan.tasks || !Array.isArray(plan.tasks)) {
                throw new Error('Invalid plan structure');
            }

            // Ensure task IDs and parent links are valid
            const taskIds = new Set(plan.tasks.map((t: PlanTask) => t.id));
            for (const task of plan.tasks) {
                if (!taskIds.has(task.parentId) && task.parentId !== 0) {
                    throw new Error(`Invalid parentId ${task.parentId} in task ${task.id}`);
                }
            }

            // Add UUID if not present
            if (!plan.planId) {
                plan.planId = uuidv4();
            }

            return plan as PlanTree;
        } catch (error) {
            console.error('Failed to parse plan:', error);
            throw new Error('Failed to generate valid plan structure');
        }
    }
}

export const plannerAgent = new PlannerAgent();