import { OpenAI } from 'openai';
import { CostForecastService } from '../cost/CostForecastService';
import { 
  OllamaModel, 
  localModels, 
  isValidOllamaModel, 
  defaultModeModelMap 
} from '../../config/ollamaModels';

export interface ModelRouterConfig {
  costThreshold: number;
  defaultLocalModel: OllamaModel;
  modeLocalModelMap?: Record<string, OllamaModel>;
}

interface OllamaResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class ModelRouterService {
  private costService = new CostForecastService();
  private defaultConfig: ModelRouterConfig = {
    costThreshold: Number(process.env.COST_THRESHOLD || '0.001'),
    defaultLocalModel: (process.env.DEFAULT_LOCAL_MODEL || 'llama3:latest') as OllamaModel,
    modeLocalModelMap: defaultModeModelMap
  };

  constructor(
    private openai: OpenAI,
    private config: Partial<ModelRouterConfig> = {}
  ) {
    this.config = { ...this.defaultConfig, ...config };
    
    // Validate configuration
    if (!isValidOllamaModel(this.config.defaultLocalModel)) {
      throw new Error(`Invalid default local model: ${this.config.defaultLocalModel}`);
    }

    Object.entries(this.config.modeLocalModelMap || {}).forEach(([mode, model]) => {
      if (!isValidOllamaModel(model)) {
        throw new Error(`Invalid local model for mode ${mode}: ${model}`);
      }
    });
  }

  getLocalModel(ownerMode: string): OllamaModel {
    const mode = ownerMode.toLowerCase();
    return (
      this.config.modeLocalModelMap?.[mode] ||
      this.config.defaultLocalModel
    );
  }

  async route(prompt: string, ownerMode: string): Promise<string> {
    const openAIModel = this.getModelForMode(ownerMode);
    const cost = this.costService.estimatePromptCost(prompt, openAIModel);

    if (cost <= this.config.costThreshold) {
      try {
        return await this.routeToLocal(prompt, ownerMode);
      } catch (error) {
        console.warn('Local model failed, falling back to OpenAI:', error);
        return await this.routeToOpenAI(prompt, openAIModel);
      }
    } else {
      return await this.routeToOpenAI(prompt, openAIModel);
    }
  }

  private async routeToLocal(prompt: string, ownerMode: string): Promise<string> {
    const localModel = this.getLocalModel(ownerMode);
    
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: localModel,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`Local model call failed: ${response.statusText}`);
    }

    const result: OllamaResponse = await response.json();
    return result.choices[0].message.content;
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

  getAvailableLocalModels(): OllamaModel[] {
    return [...localModels];
  }

  getModelCapabilities(): Record<string, string[]> {
    return this.config.modeLocalModelMap || defaultModeModelMap;
  }
}

export default ModelRouterService;
