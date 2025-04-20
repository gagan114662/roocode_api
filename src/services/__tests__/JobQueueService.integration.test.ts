import { jest, describe, beforeEach, afterEach, beforeAll, afterAll, it, expect } from '@jest/globals';
import { JobQueueService } from '../JobQueueService';
import { JobData } from '../../types/jobs';
import { setupTestDb, cleanupTestDb, sleep } from './test-utils';

describe('JobQueueService Integration Tests', () => {
  let jobQueueService: JobQueueService;

  beforeAll(async () => {
    // Set test environment variables
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.NODE_ENV = 'test';
    
    // Initialize test database
    await setupTestDb();
  });

  beforeEach(async () => {
    jobQueueService = new JobQueueService();
  });

  afterEach(async () => {
    await jobQueueService.cleanup();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  describe('Job Queue Operations', () => {
    it('should successfully add and retrieve a job', async () => {
      const jobData: JobData = {
        projectId: 'test-project',
        prompt: 'test prompt',
        mode: 'test'
      };

      // Add job
      const jobId = await jobQueueService.addJob('test', jobData);
      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');

      // Retrieve job
      const job = await jobQueueService.getJob(jobId);
      expect(job).toBeDefined();
      expect(job?.data).toEqual(jobData);
    }, 10000); // Increased timeout for integration test

    it('should return queue statistics', async () => {
      // Add a few test jobs
      const jobData: JobData = { projectId: 'test-project' };
      await jobQueueService.addJob('test1', jobData);
      await jobQueueService.addJob('test2', jobData);

      // Wait for jobs to be processed
      await sleep(1000);

      const status = await jobQueueService.getQueueStatus();
      expect(status).toHaveProperty('waiting');
      expect(status).toHaveProperty('active');
      expect(status).toHaveProperty('completed');
      expect(status).toHaveProperty('failed');
      expect(status).toHaveProperty('total');
      expect(status.total).toBeGreaterThan(0);
    }, 10000);

    it('should handle job completion', async () => {
      // Add a job that completes quickly
      const jobData: JobData = {
        projectId: 'test-project',
        prompt: 'quick test'
      };

      const jobId = await jobQueueService.addJob('quick', jobData);
      
      // Wait for job to complete
      await sleep(2000);

      const job = await jobQueueService.getJob(jobId);
      expect(job?.status).toBe('completed');
    }, 15000);

    it('should remove job when requested', async () => {
      const jobData: JobData = { projectId: 'test-project' };
      const jobId = await jobQueueService.addJob('test', jobData);

      await jobQueueService.removeJob(jobId);
      const job = await jobQueueService.getJob(jobId);
      expect(job).toBeNull();
    }, 10000);
  });

  describe('Error Handling', () => {
    it('should handle invalid job IDs gracefully', async () => {
      const job = await jobQueueService.getJob('non-existent-id');
      expect(job).toBeNull();
    });

    it('should handle job failures', async () => {
      const jobData: JobData = {
        projectId: 'test-project',
        mode: 'error' // Trigger an error condition
      };

      const jobId = await jobQueueService.addJob('error', jobData);
      await sleep(2000); // Wait for job to process

      const job = await jobQueueService.getJob(jobId);
      expect(job?.status).toBe('failed');
    }, 15000);
  });
});