import { OpenAI } from 'openai';
import { withRetry, RetryOptions } from '../utils/retry';
import { JsonValidator } from '../utils/validators';

export type OpenAIError = {
  code: string;
  message: string;
  type: 'api_error' | 'validation_error' | 'timeout_error' | 'unknown_error';
};

export interface OpenAIResponse<T> {
  success: boolean;
  data?: T;
  error?: OpenAIError;
}

export class OpenAIService {
  private static instance: OpenAIService;
  private openai: OpenAI;
  private retryOptions: Partial<RetryOptions>;

  private constructor() {
    this.openai = new OpenAI();
    this.retryOptions = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000
    };
  }

  public static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  async chatCompletion(
    prompt: string, 
    expectedJsonSchema?: boolean
  ): Promise<OpenAIResponse<string>> {
    try {
      const completion = await withRetry(
        async () => {
          return await this.openai.chat.completions.create({
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }]
          });
        },
        this.retryOptions
      );

      const content = completion.choices[0]?.message?.content;
      
      if (!content) {
        return {
          success: false,
          error: {
            code: 'no_content',
            message: 'No content in OpenAI response',
            type: 'api_error'
          }
        };
      }

      if (expectedJsonSchema) {
        const sanitized = JsonValidator.sanitizeJsonResponse(content);
        const parsed = JsonValidator.tryParseJson(sanitized);
        
        if (!parsed.success) {
          return {
            success: false,
            error: {
              code: 'invalid_json',
              message: `Invalid JSON response: ${parsed.error}`,
              type: 'validation_error'
            }
          };
        }
      }

      return {
        success: true,
        data: expectedJsonSchema ? JsonValidator.sanitizeJsonResponse(content) : content
      };

    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        return {
          success: false,
          error: {
            code: error.code || 'api_error',
            message: error.message,
            type: 'api_error'
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'unknown_error',
          message: error instanceof Error ? error.message : String(error),
          type: 'unknown_error'
        }
      };
    }
  }
}

export const openaiService = OpenAIService.getInstance();