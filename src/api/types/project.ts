import { z } from 'zod';

// Zod schema for task validation
export const taskSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    ownerMode: z.enum(['pm', 'architect', 'code', 'debug']).transform(mode => mode.toLowerCase())
});

export const taskStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'failed']);

export const taskResultSchema = z.object({
    taskId: z.string(),
    output: z.string(),
    error: z.string().optional(),
    status: taskStatusSchema
});

export const planMetadataSchema = z.object({
    createdAt: z.string(),
    status: z.enum(['pending', 'in_progress', 'completed']),
    lastUpdated: z.string().optional()
});

// Zod schema for plan validation
export const planSchema = z.object({
    description: z.string(),
    tasks: z.array(taskSchema),
    metadata: planMetadataSchema
});

// TypeScript interfaces derived from schemas
export type Task = z.infer<typeof taskSchema>;
export type TaskResult = z.infer<typeof taskResultSchema>;
export type PlanMetadata = z.infer<typeof planMetadataSchema>;
export type Plan = z.infer<typeof planSchema>;

// Response from LLM might have different formats, this helps normalize them
export function normalizePlan(rawPlan: any): Plan {
    // If the plan already matches our schema, return it
    try {
        return planSchema.parse(rawPlan);
    } catch (e) {
        // Otherwise, try to convert common formats
        const tasks: Task[] = [];
        const now = new Date().toISOString();
    
        // Convert features array if it exists
        if (Array.isArray(rawPlan.features)) {
            tasks.push(...rawPlan.features.map((feature: any, index: number) => ({
                id: feature.id?.toString() || `task-${index + 1}`,
                title: feature.name || feature.title || `Task ${index + 1}`,
                description: feature.description || "",
                ownerMode: "code" as const
            })));
        }
    
        // Convert steps array if it exists
        if (Array.isArray(rawPlan.steps)) {
            tasks.push(...rawPlan.steps.map((step: any, index: number) => ({
                id: step.id?.toString() || `task-${index + 1}`,
                title: step.title || step.name || `Task ${index + 1}`,
                description: step.description || "",
                ownerMode: (step.ownerMode?.toLowerCase() || "code") as Task['ownerMode']
            })));
        }
    
        // If features or steps weren't found, try to extract tasks directly
        if (tasks.length === 0 && Array.isArray(rawPlan.tasks)) {
            tasks.push(...rawPlan.tasks.map((task: any, index: number) => ({
                id: task.id?.toString() || `task-${index + 1}`,
                title: task.title || task.name || `Task ${index + 1}`,
                description: task.description || "",
                ownerMode: (task.ownerMode?.toLowerCase() || "code") as Task['ownerMode']
            })));
        }
    
        // If no valid task arrays were found, throw error
        if (tasks.length === 0) {
            throw new Error('Could not normalize plan: no valid tasks found');
        }
    
        const normalizedPlan: Plan = {
            description: rawPlan.description || rawPlan.project || "Project Plan",
            tasks,
            metadata: {
                createdAt: now,
                status: 'pending',
                lastUpdated: now
            }
        };
    
        // Validate the normalized plan
        return planSchema.parse(normalizedPlan);
    }
}