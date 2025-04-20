import { PlanTree, PlanTask } from '../../types/plan';
import { JobQueueService } from '../JobQueueService';
import { ProjectService } from '../project.service';
import { v4 as uuidv4 } from 'uuid';
import {
  planExecutionStarted,
  planExecutionSucceeded,
  planExecutionFailed,
  planExecutionCancelled,
  planExecutionDuration,
  planTasksExecuted,
  planTaskDuration
} from '../metrics/planMetrics';

interface TaskExecutionResult {
  taskId: number;
  status: 'success' | 'failed' | 'cancelled';
  message?: string;
  timestamp: Date;
  duration?: number; // in seconds
}

interface ExecutionHistory {
  planId: string;
  tasks: TaskExecutionResult[];
  startTime?: Date;
  endTime?: Date;
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled';
}

// Default timeout for task execution (5 minutes)
const DEFAULT_TASK_TIMEOUT_MS = 5 * 60 * 1000;

export class PlanExecutor {
  private jobQueue: JobQueueService;
  private projectService: ProjectService;
  private executionHistory: Map<string, ExecutionHistory> = new Map();

  constructor(jobQueue: JobQueueService, projectService: ProjectService) {
    this.jobQueue = jobQueue;
    this.projectService = projectService;
  }

  /**
   * Execute a plan tree by recursively processing tasks in depth-first order
   * @param plan The plan tree to execute
   * @param projectId The project ID
   * @returns The execution history
   */
  async executeTree(plan: PlanTree, projectId: string): Promise<ExecutionHistory> {
    const startTime = Date.now();
    
    // Record metrics
    planExecutionStarted.inc({ project_id: projectId });
    
    // Initialize execution history
    const history: ExecutionHistory = {
      planId: plan.planId,
      tasks: [],
      startTime: new Date(),
      status: 'in_progress'
    };
    this.executionHistory.set(plan.planId, history);
    
    try {
      // Start with the parent task
      await this.executeTask(plan.parent, plan, projectId);

      // Find all top-level tasks (tasks with parentId = 0)
      const topLevelTasks = plan.tasks.filter(task => task.parentId === 0);
      
      // Execute each top-level task and its children recursively
      for (const task of topLevelTasks) {
        await this.executeTaskAndChildren(task, plan, projectId);
      }

      // Update history status
      history.status = 'completed';
      history.endTime = new Date();
      
      // Record metrics
      planExecutionSucceeded.inc({ project_id: projectId });
      planExecutionDuration.observe(
        { project_id: projectId },
        (Date.now() - startTime) / 1000
      );
      
      // Save execution history to project
      await this.saveExecutionHistory(projectId, plan.planId);

      return history;
    } catch (error) {
      // Update history status
      history.status = 'failed';
      history.endTime = new Date();
      
      // Record metrics
      planExecutionFailed.inc({ project_id: projectId });
      planExecutionDuration.observe(
        { project_id: projectId },
        (Date.now() - startTime) / 1000
      );
      
      // Save execution history to project
      await this.saveExecutionHistory(projectId, plan.planId);
      
      throw error;
    }
  }

  /**
   * Execute a task and all its children recursively in depth-first order
   * @param task The task to execute
   * @param plan The complete plan tree
   * @param projectId The project ID
   */
  private async executeTaskAndChildren(task: PlanTask, plan: PlanTree, projectId: string): Promise<void> {
    // Execute the current task
    await this.executeTask(task, plan, projectId);

    // Find all child tasks
    const childTasks = plan.tasks.filter(t => t.parentId === task.id);
    
    // Execute each child task and its children recursively
    for (const childTask of childTasks) {
      await this.executeTaskAndChildren(childTask, plan, projectId);
    }
  }

  /**
   * Execute a single task using the appropriate mode
   * @param task The task to execute
   * @param plan The complete plan tree
   * @param projectId The project ID
   */
  private async executeTask(
    task: PlanTask | { id: number; title: string; description: string; ownerMode: string },
    plan: PlanTree,
    projectId: string
  ): Promise<void> {
    console.log(`Executing task ${task.id}: ${task.title} (${task.ownerMode})`);
    const startTime = Date.now();
    
    try {
      // Add job to queue with the appropriate mode
      const jobId = await this.jobQueue.addJob('execute-task', {
        projectId,
        prompt: task.description,
        mode: task.ownerMode,
        options: {
          planId: plan.planId,
          taskId: task.id
        }
      });

      // Wait for job to complete
      const result = await this.waitForJobCompletion(jobId);
      
      // Calculate duration
      const duration = (Date.now() - startTime) / 1000;
      
      // Record metrics
      planTaskDuration.observe(
        {
          project_id: projectId,
          owner_mode: task.ownerMode
        },
        duration
      );
      
      // Record result in execution history
      this.recordTaskExecution(
        plan.planId,
        task.id,
        'success',
        undefined,
        duration
      );
      
      // Commit changes after each task
      await this.projectService.commit(
        projectId,
        `task(${task.id}): ${task.title}`
      );
    } catch (error) {
      console.error(`Failed to execute task ${task.id}:`, error);
      
      // Calculate duration
      const duration = (Date.now() - startTime) / 1000;
      
      // Record failure in execution history
      this.recordTaskExecution(
        plan.planId,
        task.id,
        'failed',
        error instanceof Error ? error.message : String(error),
        duration
      );
      
      // Optionally, we could implement auto-replanning here
      // await this.replanOnFailure(plan, task, error, projectId);
      
      throw error;
    }
  }

  /**
   * Wait for a job to complete
   * @param jobId The job ID to wait for
   * @returns The job result
   */
  private async waitForJobCompletion(jobId: string, timeoutMs: number = DEFAULT_TASK_TIMEOUT_MS): Promise<any> {
    // Poll job status until complete or failed
    let status = await this.jobQueue.getJobStatus(jobId);
    const startTime = Date.now();
    
    while (status === 'waiting' || status === 'active') {
      // Check for timeout
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Task execution timed out after ${timeoutMs / 1000} seconds`);
      }
      
      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, 1000));
      status = await this.jobQueue.getJobStatus(jobId);
    }
    
    if (status === 'failed') {
      const job = await this.jobQueue.getJob(jobId);
      throw new Error(job?.result?.error || 'Job failed');
    }
    
    const job = await this.jobQueue.getJob(jobId);
    return job?.result?.data;
  }

  /**
   * Record a task execution result in the history
   * @param planId The plan ID
   * @param taskId The task ID
   * @param status The execution status
   * @param message Optional message (for failures)
   */
  private recordTaskExecution(
    planId: string,
    taskId: number,
    status: 'success' | 'failed' | 'cancelled',
    message?: string,
    duration?: number
  ): void {
    const history = this.executionHistory.get(planId);
    
    if (history) {
      history.tasks.push({
        taskId,
        status,
        message,
        timestamp: new Date(),
        duration
      });
      
      // Record metrics
      planTasksExecuted.inc({
        project_id: history.tasks[0]?.taskId.toString().split('-')[0] || 'unknown',
        status
      });
      
      if (duration) {
        planTaskDuration.observe(
          {
            project_id: history.tasks[0]?.taskId.toString().split('-')[0] || 'unknown',
            owner_mode: 'unknown' // We don't have the owner mode here, would need to pass it
          },
          duration
        );
      }
    }
  }

  /**
   * Save execution history to the project
   * @param projectId The project ID
   * @param planId The plan ID
   */
  private async saveExecutionHistory(projectId: string, planId: string): Promise<void> {
    const history = this.executionHistory.get(planId);
    
    if (history) {
      await this.projectService.writeFile(
        projectId,
        `plan-${planId}-history.json`,
        JSON.stringify(history, null, 2)
      );
    }
  }

  /**
   * Get execution history for a plan
   * @param planId The plan ID
   * @returns The execution history or null if not found
   */
  getExecutionHistory(planId: string): ExecutionHistory | null {
    return this.executionHistory.get(planId) || null;
  }

  /**
   * Cancel a plan execution
   * @param planId The plan ID to cancel
   * @returns true if the plan was cancelled, false if it wasn't found or already completed
   */
  cancelExecution(planId: string): boolean {
    const history = this.executionHistory.get(planId);
    
    if (!history || history.status === 'completed' || history.status === 'failed') {
      return false;
    }
    
    // Update history status
    history.status = 'cancelled';
    history.endTime = new Date();
    
    // Record metrics
    planExecutionCancelled.inc({
      project_id: history.tasks[0]?.taskId.toString().split('-')[0] || 'unknown'
    });
    
    return true;
  }

  /**
   * Load execution history from a project
   * @param projectId The project ID
   * @param planId The plan ID
   * @returns The execution history or null if not found
   */
  async loadExecutionHistory(projectId: string, planId: string): Promise<ExecutionHistory | null> {
    try {
      const historyJson = await this.projectService.readFile(
        projectId,
        `plan-${planId}-history.json`
      );
      
      if (historyJson) {
        const history = JSON.parse(historyJson) as ExecutionHistory;
        this.executionHistory.set(planId, history);
        return history;
      }
    } catch (error) {
      console.error('Failed to load execution history:', error);
    }
    
    return null;
  }
}

// Create singleton instance
let planExecutorInstance: PlanExecutor | null = null;

export function createPlanExecutor(
  jobQueue: JobQueueService,
  projectService: ProjectService
): PlanExecutor {
  if (!planExecutorInstance) {
    planExecutorInstance = new PlanExecutor(jobQueue, projectService);
  }
  return planExecutorInstance;
}