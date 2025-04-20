import { OpenAI } from 'openai';
import { CostForecastService } from '../cost/CostForecastService';

interface OllamaResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class ModelRouterService {
  private openai: OpenAI;
  private costService = new CostForecastService();
  private costThreshold = Number(process.env.COST_THRESHOLD || '0.001');
  private localModel = process.env.OLLAMA_MODEL || 'llama2';

  constructor(openai: OpenAI) {
    this.openai = openai;
  }

  async route(prompt: string, ownerMode: string): Promise<string> {
    const model = this.getModelForMode(ownerMode);
    const cost = this.costService.estimatePromptCost(prompt, model);

    if (cost <= this.costThreshold) {
      // Use local Ollama
      return await this.routeToLocal(prompt);
    } else {
      // Fallback to OpenAI
      return await this.routeToOpenAI(prompt, model);
    }
  }

  private async routeToLocal(prompt: string): Promise<string> {
    try {
      // Mock Ollama call for now
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.localModel,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        throw new Error('Local model call failed');
      }

      const result: OllamaResponse = await response.json();
      return result.choices[0].message.content;
    } catch (error) {
      console.warn('Local model failed, falling back to OpenAI:', error);
      return this.routeToOpenAI(prompt, 'gpt-3.5-turbo');
    }
  }

  private async routeToOpenAI(prompt: string, model: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0
    });

    return response.choices[0].message.content;
  }

  getModelForMode(ownerMode: string): string {
    const map: Record<string, string> = {
      code: 'code-davinci-002',
      debug: 'code-davinci-002',
      testgen: 'gpt-4-turbo',
      cicd: 'gpt-4-turbo',
      refactor: 'code-davinci-002',
      docgen: 'gpt-3.5-turbo'
    };
    return map[ownerMode.toLowerCase()] || 'gpt-4-turbo';
  }
}

export default ModelRouterService;
