export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed';

export interface JobData {
  projectId?: string;
  prompt?: string;
  mode?: string;
  options?: Record<string, any>;
  _startTime?: number; // Internal field for metrics tracking
}

export interface JobResult {
  status: JobStatus;
  data?: any;
  error?: string;
}

export interface Job {
  id: string;
  name: string;
  data: JobData;
  status: JobStatus;
  progress: number;
  result?: JobResult;
  createdAt: Date;
  finishedAt?: Date;
}

export interface JobError extends Error {
  jobId?: string;
}

export interface JobMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  total: number;
}