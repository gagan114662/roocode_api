import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ModelRouterService } from '../ModelRouterService';
import { OpenAI } from 'openai';
import { CostForecastService } from '../../cost/CostForecastService';

jest.mock('../../cost/CostForecastService');
global.fetch = jest.fn();

describe('ModelRouterService', () => {
  let service: ModelRouterService;
  let mockOpenAI: jest.Mocked<OpenAI>;

  beforeEach(() => {
    jest.resetAllMocks();
    
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    } as any;

    service = new ModelRouterService(mockOpenAI);
  });

  describe('route', () => {
    it('should route to local model when cost is below threshold', async () => {
      const prompt = 'test prompt';
      const ownerMode = 'code';

      (CostForecastService.prototype.estimatePromptCost as jest.Mock)
        .mockReturnValue(0.0005); // Below default threshold of 0.001

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'local response' } }]
        })
      });

      const result = await service.route(prompt, ownerMode);
      expect(result).toBe('local response');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.any(Object)
      );
    });

    it('should route to OpenAI when cost is above threshold', async () => {
      const prompt = 'test prompt';
      const ownerMode = 'code';

      (CostForecastService.prototype.estimatePromptCost as jest.Mock)
        .mockReturnValue(0.002); // Above default threshold

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'openai response' } }]
      } as any);

      const result = await service.route(prompt, ownerMode);
      expect(result).toBe('openai response');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
    });

    it('should fallback to OpenAI when local model fails', async () => {
      const prompt = 'test prompt';
      const ownerMode = 'code';

      (CostForecastService.prototype.estimatePromptCost as jest.Mock)
        .mockReturnValue(0.0005);

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Local model failed'));

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'fallback response' } }]
      } as any);

      const result = await service.route(prompt, ownerMode);
      expect(result).toBe('fallback response');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
    });
  });

  describe('getModelForMode', () => {
    it('should return correct model for each mode', () => {
      expect(service.getModelForMode('code')).toBe('code-davinci-002');
      expect(service.getModelForMode('debug')).toBe('code-davinci-002');
      expect(service.getModelForMode('testgen')).toBe('gpt-4-turbo');
      expect(service.getModelForMode('unknown')).toBe('gpt-4-turbo');
    });

    it('should be case-insensitive', () => {
      expect(service.getModelForMode('CODE')).toBe('code-davinci-002');
      expect(service.getModelForMode('Debug')).toBe('code-davinci-002');
    });
  });
});
