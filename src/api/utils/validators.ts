import { z } from 'zod';
import { planSchema, taskSchema } from '../types/project';

export class JsonValidator {
  static tryParseJson(text: string): { success: boolean; data?: any; error?: string } {
    try {
      const data = JSON.parse(text);
      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Invalid JSON'
      };
    }
  }

  static sanitizeJsonResponse(response: string): string {
    // Remove any text before the first {
    const jsonStart = response.indexOf('{');
    if (jsonStart === -1) return response;
    
    // Remove any text after the last }
    const jsonEnd = response.lastIndexOf('}');
    if (jsonEnd === -1) return response;
    
    return response.slice(jsonStart, jsonEnd + 1);
  }

  static validatePlan(data: unknown) {
    return planSchema.safeParse(data);
  }

  static validateTask(data: unknown) {
    return taskSchema.safeParse(data);
  }
}