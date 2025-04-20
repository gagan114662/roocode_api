import { MemoryService } from '../memory/MemoryService';
import { OpenAIApi } from 'openai';
import { createCompletion } from '../providers/openaiProvider';

const memoryService = new MemoryService();

export class PlannerAgent {
  constructor(private openai: OpenAIApi) {}

  async createPlanTree(projectId: string, prompt: string) {
    const context = await memoryService.readSection(projectId, 'productContext');
    const fullPrompt = context
      ? `Project Context:\n${context}\n\n${prompt}`
      : prompt;

    const plan = await this.generatePlan(fullPrompt);
    
    await memoryService.appendToSection(
      projectId,
      'decisionLog',
      `Generated plan for: ${prompt}\nSteps: ${plan.steps.map(s => s.title).join(', ')}`
    );

    return plan;
  }

  async executePlanStep(projectId: string, step: any) {
    try {
      const result = await this.executeStep(step);
      
      await memoryService.appendToSection(
        projectId,
        'implementationNotes',
        `Completed step: ${step.title}\nOutput: ${result.summary}`
      );

      return result;
    } catch (error) {
      await memoryService.appendToSection(
        projectId,
        'ciIssues',
        `Failed step: ${step.title}\nError: ${error.message}`
      );
      throw error;
    }
  }

  private async generatePlan(prompt: string) {
    return {
      steps: [
        { id: 1, title: 'Initialize project' },
        { id: 2, title: 'Add core functionality' }
      ]
    };
  }

  private async executeStep(step: any) {
    return {
      summary: `Executed ${step.title}`,
      output: 'Step output here'
    };
  }
}

export default PlannerAgent;
