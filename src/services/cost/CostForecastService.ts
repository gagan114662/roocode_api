import { PlanTree } from '../planner/PlannerAgent';

const MODEL_PRICING: Record<string, number> = {
  'gpt-4': 0.03,          // $0.03 per 1K tokens
  'gpt-4-turbo': 0.015,   // $0.015 per 1K tokens
  'code-davinci-002': 0.02, // $0.02 per 1K tokens
  'gpt-3.5-turbo': 0.002,   // $0.002 per 1K tokens
  'text-davinci-003': 0.02  // $0.02 per 1K tokens
};

export class CostForecastService {
  estimatePromptCost(prompt: string, model: string): number {
    // Rough token count estimation (4 characters per token on average)
    const tokens = Math.ceil(prompt.length / 4);
    const price = MODEL_PRICING[model] ?? MODEL_PRICING['gpt-4-turbo'];
    return (tokens / 1000) * price;
  }

  estimatePlanCost(
    plan: PlanTree,
    modelMap: Record<string, string> = {}
  ): number {
    return plan.tasks.reduce((sum, task) => {
      // Construct prompt similar to what would be sent to LLM
      const prompt = `Task ${task.id}: ${task.description}
Owner Mode: ${task.ownerMode}
Title: ${task.title}
Parent Context: ${task.parentId ? 'Task ' + task.parentId : 'Root'}`;

      const model = modelMap[task.ownerMode] || 'gpt-4-turbo';
      return sum + this.estimatePromptCost(prompt, model);
    }, 0);
  }

  getAvailableModels(): string[] {
    return Object.keys(MODEL_PRICING);
  }

  getModelPrice(model: string): number {
    return MODEL_PRICING[model] ?? MODEL_PRICING['gpt-4-turbo'];
  }
}

export default CostForecastService;
