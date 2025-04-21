import { z } from 'zod';

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  organizationId?: string;
  maxRetries?: number;
  timeout?: number;
}

export interface ProviderResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, unknown>;
}

export interface PromptOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
}

// Schema for validating prompt options
export const promptOptionsSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  stop: z.array(z.string()).optional()
});

export interface BaseProvider {
  /**
   * Initialize the provider with configuration
   */
  init(config: ProviderConfig): Promise<void>;

  /**
   * Send a prompt to the model and get a response
   */
  completePrompt(
    prompt: string,
    options?: PromptOptions
  ): Promise<ProviderResponse>;

  /**
   * Get current token usage statistics
   */
  getUsage(): Promise<{
    totalTokens: number;
    totalCost: number;
  }>;

  /**
   * Get supported models for this provider
   */
  getModels(): Promise<string[]>;

  /**
   * Validate the provider configuration
   */
  validateConfig(config: ProviderConfig): Promise<boolean>;

  /**
   * Get the cost per token for a given model
   */
  getTokenCost(model: string): number;
}

// Base class that providers can extend
export abstract class Provider implements BaseProvider {
  protected config: ProviderConfig;
  protected usage = {
    totalTokens: 0,
    totalCost: 0
  };

  constructor() {
    this.config = {
      apiKey: '',
      maxRetries: 3,
      timeout: 30000
    };
  }

  async init(config: ProviderConfig): Promise<void> {
    this.config = {
      ...this.config,
      ...config
    };
    await this.validateConfig(this.config);
  }

  abstract completePrompt(
    prompt: string,
    options?: PromptOptions
  ): Promise<ProviderResponse>;

  async getUsage(): Promise<{ totalTokens: number; totalCost: number }> {
    return this.usage;
  }

  abstract getModels(): Promise<string[]>;

  async validateConfig(config: ProviderConfig): Promise<boolean> {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }
    return true;
  }

  abstract getTokenCost(model: string): number;

  protected updateUsage(tokens: number, cost: number): void {
    this.usage.totalTokens += tokens;
    this.usage.totalCost += cost;
  }
}