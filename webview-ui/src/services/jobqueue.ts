// File: src/services/jobQueue.ts
import { Queue, QueueScheduler, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

// Configure Redis connection (set REDIS_URL in your .env)
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

// Initialize a scheduler (required for delayed and repeated jobs)
export const queueScheduler = new QueueScheduler('roocode-jobs', { connection });

// Main job queue
export const jobQueue = new Queue('roocode-jobs', { connection });

// Example worker handling different job types
new Worker(
  'roocode-jobs',
  async (job: Job) => {
    switch (job.name) {
      case 'plan':
        // call your planner logic, e.g.:
        // const plan = await plannerService.createPlan(job.data.prompt);
        // return plan;
        break;
      case 'codegen':
        // const result = await codegenService.generate(job.data);
        // return result;
        break;
      case 'qa':
        // const report = await qaService.run(job.data.projectId);
        // return report;
        break;
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  { connection }
);

// Optional: export a convenience function to enqueue jobs
export function enqueueJob(type: string, data: any) {
  return jobQueue.add(type, data, {
    removeOnComplete: true,
    removeOnFail: false
  });
}
