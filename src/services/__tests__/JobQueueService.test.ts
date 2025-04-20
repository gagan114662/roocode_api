import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { JobQueueService } from '../JobQueueService';
import type { JobData } from '../../types/jobs';

interface MockQueueJob {
  id: string;
  name: string;
  data: JobData;
  timestamp: number;
  progress: () => Promise<number>;
  getState: () => Promise<string>;
  returnvalue: any;
  finishedOn: number | null;
}

describe('JobQueueService', () => {
  let jobQueueService: JobQueueService;

  beforeEach(async () => {
    jobQueueService = new JobQueueService();
  });

  afterEach(async () => {
    await jobQueueService.cleanup();
  });

  describe('addJob', () => {
    it('should successfully add a job', async () => {
      const jobData: JobData = {
        projectId: 'test-project',
        prompt: 'test prompt',
        mode: 'test'
      };

      const jobId = await jobQueueService.addJob('test', jobData);
      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
    });

    it('should handle job retrieval', async () => {
      const jobData: JobData = {
        projectId: 'test-project',
        prompt: 'test prompt'
      };

      const jobId = await jobQueueService.addJob('test', jobData);
      const job = await jobQueueService.getJob(jobId);

      expect(job).toBeDefined();
      expect(job?.id).toBe(jobId);
      expect(job?.data).toEqual(jobData);
      expect(job?.status).toBeDefined();
    });
  });

  describe('getJob', () => {
    it('should return null for non-existent job', async () => {
      const job = await jobQueueService.getJob('non-existent-id');
      expect(job).toBeNull();
    });

    it('should return job details for existing job', async () => {
      const jobData: JobData = {
        projectId: 'test-project',
        mode: 'test'
      };

      const jobId = await jobQueueService.addJob('test', jobData);
      const job = await jobQueueService.getJob(jobId);

      expect(job).toBeDefined();
      expect(job?.id).toBe(jobId);
      expect(job?.data).toEqual(jobData);
      expect(job?.status).toBeDefined();
      expect(typeof job?.progress).toBe('number');
      expect(job?.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('getQueueStatus', () => {
    it('should return queue statistics', async () => {
      const status = await jobQueueService.getQueueStatus();

      expect(status).toHaveProperty('waiting');
      expect(status).toHaveProperty('active');
      expect(status).toHaveProperty('completed');
      expect(status).toHaveProperty('failed');
      expect(status).toHaveProperty('total');
      expect(typeof status.total).toBe('number');
    });
  });

  describe('removeJob', () => {
    it('should remove an existing job', async () => {
      const jobData: JobData = { projectId: 'test-project' };
      const jobId = await jobQueueService.addJob('test', jobData);

      await jobQueueService.removeJob(jobId);
      const job = await jobQueueService.getJob(jobId);
      expect(job).toBeNull();
    });

    it('should handle removing non-existent job', async () => {
      await expect(jobQueueService.removeJob('non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should close connections properly', async () => {
      await expect(jobQueueService.cleanup()).resolves.not.toThrow();
    });
  });
});