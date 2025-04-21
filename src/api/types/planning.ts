import { Plan } from '../services/plan-service';

export interface CreatePlanResponse {
  status: 'success';
  data: {
    plan: Plan;
  };
}

export interface ExecutePlanResponse {
  status: 'success';
  data: {
    results: Array<{
      taskId: string;
      output: string;
    }>;
  };
}

export interface PlanningErrorResponse {
  status: 'error';
  message: string;
  error?: string;
}