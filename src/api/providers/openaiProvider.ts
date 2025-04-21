import OpenAI from 'openai';
import { BaseProvider, ProviderConfig, ProviderResponse, PromptOptions, promptOptionsSchema } from './baseProvider';
import { z } from 'zod';
import { getRequiredEnvVar } from '../../utils/env';

const openAIConfigSchema = z.object({
  apiKey: z.string(),
  organization: z.string().optional(),
  baseURL: z.string().optional(),
  defaultModel: z.string().default('gpt-4-turbo-preview')
});

export class OpenAIProvider implements BaseProvider {
  private defaultModel: string;
  private usage = {
    totalTokens: 0,
    totalCost: 0
  };
  protected config: ProviderConfig;
  
  // Private OpenAI client instance
  private _client: OpenAI;

  // Public getter for backward compatibility
  get client(): OpenAI {
    return this._client;
  }

  get chat(): OpenAI.Chat {
    return this._client.chat;
  }

  constructor() {
    this.defaultModel = 'gpt-4-turbo-preview';
    this.config = {
      apiKey: getRequiredEnvVar('OPENAI_API_KEY'),
      maxRetries: 3,
      timeout: 30000
    };
    this._client = new OpenAI({
      apiKey: this.config.apiKey
    });
  }

  async init(config: ProviderConfig): Promise<void> {
    const validated = openAIConfigSchema.parse({
      apiKey: config.apiKey,
      organization: config.organizationId,
      baseURL: config.baseUrl,
      defaultModel: 'gpt-4-turbo-preview'
    });

    this.defaultModel = validated.defaultModel;
    this._client = new OpenAI({
      apiKey: validated.apiKey,
      organization: validated.organization,
      baseURL: validated.baseURL
    });
    this.config = config;
  }

  async completePrompt(prompt: string, options: PromptOptions = {}): Promise<ProviderResponse> {
    const validatedOptions = promptOptionsSchema.parse(options);

    const response = await this.chat.completions.create({
      model: this.defaultModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: validatedOptions.temperature ?? 0.7,
      max_tokens: validatedOptions.maxTokens,
      top_p: validatedOptions.topP,
      frequency_penalty: validatedOptions.frequencyPenalty,
      presence_penalty: validatedOptions.presencePenalty,
      stop: validatedOptions.stop
    });

    const usage = response.usage;
    if (usage) {
      this.updateUsage(
        usage.total_tokens,
        usage.total_tokens * this.getTokenCost(this.defaultModel)
      );
    }

    return {
      content: response.choices[0]?.message?.content || '',
      usage: usage ? {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens
      } : undefined,
      metadata: {
        model: response.model,
        finishReason: response.choices[0]?.finish_reason
      }
    };
  }

  async getUsage(): Promise<{ totalTokens: number; totalCost: number }> {
    return this.usage;
  }

  async getModels(): Promise<string[]> {
    const response = await this._client.models.list();
    return response.data.map(model => model.id);
  }

  async validateConfig(config: ProviderConfig): Promise<boolean> {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }
    return true;
  }

  getTokenCost(model: string): number {
    // Token costs in USD per 1K tokens
    const costs: Record<string, number> = {
      'gpt-4-turbo-preview': 0.01,
      'gpt-4': 0.03,
      'gpt-3.5-turbo': 0.001
    };

    return costs[model] || costs['gpt-3.5-turbo'];
  }

  protected updateUsage(tokens: number, cost: number): void {
    this.usage.totalTokens += tokens;
    this.usage.totalCost += cost;
  }
}

// Export singleton instance
export const openai = new OpenAIProvider();

// Helper functions
export async function createPlan(prompt: string, options?: PromptOptions): Promise<string> {
  const response = await openai.completePrompt(prompt, options);
  return response.content;
}