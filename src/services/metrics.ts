import { Counter, Histogram } from 'prom-client';

// Job metrics
export const jobsEnqueued = new Counter({
    name: 'roocode_jobs_enqueued_total',
    help: 'Number of jobs enqueued',
    labelNames: ['job_type']
});

export const jobsCompleted = new Counter({
    name: 'roocode_jobs_completed_total',
    help: 'Number of jobs completed successfully',
    labelNames: ['job_type']
});

export const jobsFailed = new Counter({
    name: 'roocode_jobs_failed_total',
    help: 'Number of jobs that failed',
    labelNames: ['job_type']
});

export const jobDuration = new Histogram({
    name: 'roocode_job_duration_seconds',
    help: 'Duration of job execution in seconds',
    labelNames: ['job_type'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
});

// Dependency update metrics
export const dependencyUpdatesAttempted = new Counter({
    name: 'roocode_dependency_updates_attempted_total',
    help: 'Number of dependency update attempts'
});

export const dependencyUpdatesSucceeded = new Counter({
    name: 'roocode_dependency_updates_succeeded_total',
    help: 'Number of successful dependency updates'
});

export const dependenciesUpdated = new Counter({
    name: 'roocode_dependencies_updated_total',
    help: 'Number of individual dependencies updated'
});