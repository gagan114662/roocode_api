import { Counter, Histogram } from 'prom-client';

// Plan execution metrics
export const planExecutionStarted = new Counter({
  name: 'roocode_plan_execution_started_total',
  help: 'Number of plan executions started',
  labelNames: ['project_id']
});

export const planExecutionSucceeded = new Counter({
  name: 'roocode_plan_execution_succeeded_total',
  help: 'Number of plan executions completed successfully',
  labelNames: ['project_id']
});

export const planExecutionFailed = new Counter({
  name: 'roocode_plan_execution_failed_total',
  help: 'Number of plan executions that failed',
  labelNames: ['project_id']
});

export const planExecutionCancelled = new Counter({
  name: 'roocode_plan_execution_cancelled_total',
  help: 'Number of plan executions that were cancelled',
  labelNames: ['project_id']
});

export const planExecutionDuration = new Histogram({
  name: 'roocode_plan_execution_duration_seconds',
  help: 'Duration of plan execution in seconds',
  labelNames: ['project_id'],
  buckets: [1, 5, 10, 30, 60, 300, 600, 1800, 3600]
});

export const planTasksExecuted = new Counter({
  name: 'roocode_plan_tasks_executed_total',
  help: 'Number of tasks executed as part of plans',
  labelNames: ['project_id', 'status']
});

export const planTaskDuration = new Histogram({
  name: 'roocode_plan_task_duration_seconds',
  help: 'Duration of task execution in seconds',
  labelNames: ['project_id', 'owner_mode'],
  buckets: [1, 5, 10, 30, 60, 300, 600]
});