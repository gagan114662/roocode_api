import { z } from 'zod';

export const taskSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    ownerMode: z.enum(['pm', 'architect', 'code', 'debug']),
    dependencies: z.array(z.string()).optional(),
});

export const planSchema = z.object({
    tasks: z.array(taskSchema),
    metadata: z.object({
        createdAt: z.string(),
        status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
    }),
});

export type Task = z.infer<typeof taskSchema>;
export type Plan = z.infer<typeof planSchema>;

export interface TaskResult {
    taskId: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    output?: string;
    error?: string;
}

export interface PlanExecutionProgress {
    projectId: string;
    type: 'task-start' | 'task-complete' | 'task-error' | 'complete' | 'error';
    task?: TaskResult;
    results?: TaskResult[];
    error?: string;
}