import { Queue, Worker, QueueScheduler, Job, ConnectionOptions } from 'bullmq';
import type { Redis } from 'ioredis';
import IORedis from 'ioredis';
import { JobData, JobStatus } from '../types/jobs';
import { createDependencyUpdateService } from './DependencyUpdateService';
import { ProjectService } from './project.service';
import { createPlanExecutor } from './planner/PlanExecutor';
import {
    jobsEnqueued,
    jobsCompleted,
    jobsFailed,
    jobDuration
} from './metrics';

interface JobError extends Error {
  jobId?: string;
}

interface JobResult {
  status: 'completed' | 'failed';
  data?: any;
  error?: string;
}

export class JobQueueService {
  private queue: Queue;
  private scheduler: QueueScheduler;
  private worker: Worker;
  private connection: Redis;
  private isInitialized: boolean = false;

  constructor() {
    const redisConfig: ConnectionOptions = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    };

    this.connection = new IORedis(process.env.REDIS_URL || redisConfig);
    this.queue = new Queue('roocode-jobs', { connection: this.connection });
    this.scheduler = new QueueScheduler('roocode-jobs', { connection: this.connection });
    
    this.worker = new Worker<JobData, JobResult>(
      'roocode-jobs',
      async (job: Job<JobData, JobResult>) => {
        try {
          await job.updateProgress(10);

          switch (job.name) {
            case 'plan':
              await job.updateProgress(50);
              return { status: 'completed', data: { plan: [] } };

            case 'codegen':
              await job.updateProgress(50);
              return { status: 'completed', data: { files: [] } };

            case 'qa':
              await job.updateProgress(50);
              return { status: 'completed', data: { passed: true } };
              
            case 'update-dependencies':
              await job.updateProgress(10);
              
              if (!job.data.projectId) {
                throw new Error('Project ID is required for dependency update');
              }

              const projectService = new ProjectService();
              const dependencyService = createDependencyUpdateService(projectService);
              const result = await dependencyService.updateDependencies(job.data.projectId);
              await job.updateProgress(100);
              
              return {
                status: result.error ? 'failed' : 'completed',
                data: result,
                error: result.error
              };
              
            case 'execute-plan':
              await job.updateProgress(10);
              
              if (!job.data.projectId || !job.data.options?.planId) {
                throw new Error('Project ID and Plan ID are required for plan execution');
              }
              
              const planExecutorService = createPlanExecutor(jobQueueService, new ProjectService());
              
              try {
                // Load plan from project
                const projectService = new ProjectService();
                const planJson = await projectService.readFile(job.data.projectId, 'plan.json');
                
                if (!planJson) {
                  throw new Error('Plan not found');
                }
                
                const plan = JSON.parse(planJson);
                
                // Execute plan
                await job.updateProgress(20);
                const result = await planExecutorService.executeTree(plan, job.data.projectId);
                await job.updateProgress(100);
                
                return {
                  status: 'completed',
                  data: result
                };
              } catch (error) {
                return {
                  status: 'failed',
                  error: error instanceof Error ? error.message : String(error)
                };
              }

            default:
              throw new Error(`Unknown job type: ${job.name}`);
          }
        } catch (error) {
          console.error(`Job ${job.id} failed:`, error);
          throw error;
        }
      },
      { connection: this.connection }
    );

    // Set up event handlers
    this.worker.on('completed', (job: Job<JobData, JobResult>) => {
        console.log(`Job ${job.id} completed successfully`);
        jobsCompleted.inc({ job_type: job.name });
    });

    this.worker.on('failed', (job: Job<JobData, JobResult> | undefined, error: JobError) => {
        console.error(`Job ${job?.id} failed:`, error);
        if (job) {
            jobsFailed.inc({ job_type: job.name });
        }
    });

    this.worker.on('active', (job: Job<JobData, JobResult>) => {
        // Start timing the job
        const startTime = Date.now();
        job.data._startTime = startTime;
    });

    this.worker.on('completed', (job: Job<JobData, JobResult>) => {
        // Record job duration if we have a start time
        if (job.data._startTime) {
            const duration = (Date.now() - job.data._startTime) / 1000;
            jobDuration.observe({ job_type: job.name }, duration);
        }
    });

    this.worker.on('error', (error: Error) => {
      console.error('Worker error:', error);
    });

    this.queue.on('error', (error: Error) => {
      console.error('Queue error:', error);
    });

    this.scheduler.on('error', (error: Error) => {
      console.error('Scheduler error:', error);
    });
  }

  private async ensureConnection(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.connection.ping();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw new Error('Redis connection failed');
    }
  }

  async addJob(name: string, data: JobData): Promise<string> {
      await this.ensureConnection();

      const startTime = Date.now();
      try {
          const job = await this.queue.add(name, data, {
              removeOnComplete: true,
              removeOnFail: false,
              attempts: 3,
              backoff: {
                  type: 'exponential',
                  delay: 1000
              }
          });

          // Record metrics
          jobsEnqueued.inc({ job_type: name });
          jobDuration.observe({ job_type: name }, (Date.now() - startTime) / 1000);

          return job.id;
      } catch (error) {
          // Record failure metric
          jobsFailed.inc({ job_type: name });
          throw error;
      }
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    await this.ensureConnection();
    
    const job = await this.queue.getJob(jobId);
    if (!job) {
      return 'failed';
    }
    
    const state = await job.getState();
    return state as JobStatus;
  }

  async getJob(jobId: string): Promise<{
    id: string;
    name: string;
    data: JobData;
    status: JobStatus;
    progress: number;
    result?: JobResult;
    createdAt: Date;
    finishedAt?: Date;
  } | null> {
    await this.ensureConnection();

    const job = await this.queue.getJob(jobId);
    if (!job) return null;

    const [state, progress] = await Promise.all([
      job.getState(),
      job.progress()
    ]);

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      status: state as JobStatus,
      progress: progress || 0,
      result: job.returnvalue,
      createdAt: job.timestamp ? new Date(job.timestamp) : new Date(),
      finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined
    };
  }

  async removeJob(jobId: string): Promise<void> {
    await this.ensureConnection();

    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }
  
  async removeJobsByFilter(filter: { name?: string; data?: Record<string, any> }): Promise<number> {
    await this.ensureConnection();
    
    // Get all jobs
    const jobs = await this.queue.getJobs(['waiting', 'active']);
    let removedCount = 0;
    
    // Filter and remove matching jobs
    for (const job of jobs) {
      let match = true;
      
      // Match job name if specified
      if (filter.name && job.name !== filter.name) {
        match = false;
      }
      
      // Match job data if specified
      if (filter.data && match) {
        for (const [key, value] of Object.entries(filter.data)) {
          if (!job.data || job.data.options?.[key] !== value) {
            match = false;
            break;
          }
        }
      }
      
      // Remove job if it matches all criteria
      if (match) {
        await job.remove();
        removedCount++;
      }
    }
    
    return removedCount;
  }

  async getQueueStatus(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    total: number;
  }> {
    await this.ensureConnection();

    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      total: waiting + active + completed + failed
    };
  }

  async cleanup(): Promise<void> {
    try {
      await Promise.all([
        this.queue.close(),
        this.scheduler.close(),
        this.worker.close()
      ]);
      await this.connection.quit();
      this.isInitialized = false;
    } catch (error) {
      console.error('Error during cleanup:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const jobQueueService = new JobQueueService();