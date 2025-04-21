import { Plan, PlanStep } from './planner';
import { QAResult } from '../services/qa/QAService';

export interface CodegenResponse {
    type: 'plan' | 'step-update' | 'text' | 'error' | 'qa-results';
    text?: string;
    plan?: Plan;
    step?: PlanStep;
    error?: Error;
    message?: string;
    qaResults?: QAResult[];
}