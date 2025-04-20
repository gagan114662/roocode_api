import { Queue, Worker, QueueScheduler, Job, ConnectionOptions } from 'bullmq';
import type { Redis } from 'ioredis';
import IORedis from 'ioredis';
import { JobData, JobStatus } from '../types/jobs';
import { createDependencyUpdateService } from './DependencyUpdateService';
import { ProjectService } from './project.service';

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
    });

    this.worker.on('failed', (job: Job<JobData, JobResult> | undefined, error: JobError) => {
      console.error(`Job ${job?.id} failed:`, error);
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

    const job = await this.queue.add(name, data, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      }
    });

    return job.id;
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