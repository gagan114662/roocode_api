import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ModelRouterService, ModelRouterConfig } from '../ModelRouterService';
import { OpenAI } from 'openai';
import { OllamaModel } from '../../../config/ollamaModels';

jest.mock('../../cost/CostForecastService');
global.fetch = jest.fn();

describe('ModelRouterService', () => {
  let service: ModelRouterService;
  let mockOpenAI: jest.Mocked<OpenAI>;
  const testConfig: ModelRouterConfig = {
    costThreshold: 0.001,
    defaultLocalModel: 'llama3:latest',
    modeLocalModelMap: {
      code: 'gemma3:27b',
      testgen: 'qwen:latest'
    }
  };

  beforeEach(() => {
    jest.resetAllMocks();
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    } as any;
  });

  describe('configuration', () => {
    it('should use default config when none provided', () => {
      service = new ModelRouterService(mockOpenAI);
      expect(service.getLocalModel('code')).toBe('deepseek-r1:32b');
    });

    it('should override defaults with provided config', () => {
      service = new ModelRouterService(mockOpenAI, testConfig);
      expect(service.getLocalModel('code')).toBe('gemma3:27b');
    });

    it('should throw error for invalid local model', () => {
      expect(() => new ModelRouterService(mockOpenAI, {
        ...testConfig,
        defaultLocalModel: 'invalid-model' as OllamaModel
      })).toThrow('Invalid default local model');
    });
  });

  describe('routing', () => {
    beforeEach(() => {
      service = new ModelRouterService(mockOpenAI, testConfig);
    });

    it('should route to local model when cost is below threshold', async () => {
      const prompt = 'test prompt';
      jest.spyOn(service['costService'], 'estimatePromptCost')
        .mockReturnValue(0.0005);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'local response' } }]
        })
      });

      const result = await service.route(prompt, 'code');
      expect(result).toBe('local response');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.objectContaining({
          body: expect.stringContaining('gemma3:27b')
        })
      );
    });

    it('should route to OpenAI when cost is above threshold', async () => {
      const prompt = 'expensive prompt';
      jest.spyOn(service['costService'], 'estimatePromptCost')
        .mockReturnValue(0.002);

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'openai response' } }]
      } as any);

      const result = await service.route(prompt, 'code');
      expect(result).toBe('openai response');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'code-davinci-002'
        })
      );
    });

    it('should fallback to OpenAI when local model fails', async () => {
      jest.spyOn(service['costService'], 'estimatePromptCost')
        .mockReturnValue(0.0005);

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Local model error'));

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'fallback response' } }]
      } as any);

      const result = await service.route('test prompt', 'code');
      expect(result).toBe('fallback response');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
    });
  });

  describe('model selection', () => {
    beforeEach(() => {
      service = new ModelRouterService(mockOpenAI, testConfig);
    });

    it('should return correct local model for mode', () => {
      expect(service.getLocalModel('code')).toBe('gemma3:27b');
      expect(service.getLocalModel('testgen')).toBe('qwen:latest');
      expect(service.getLocalModel('unknown')).toBe('llama3:latest');
    });

    it('should be case-insensitive for mode lookup', () => {
      expect(service.getLocalModel('CODE')).toBe('gemma3:27b');
      expect(service.getLocalModel('TestGen')).toBe('qwen:latest');
    });

    it('should provide list of available local models', () => {
      const models = service.getAvailableLocalModels();
      expect(models).toContain('llama3:latest');
      expect(models).toContain('gemma3:27b');
      expect(models).toContain('qwen:latest');
    });

    it('should provide model capabilities mapping', () => {
      const capabilities = service.getModelCapabilities();
      expect(capabilities).toHaveProperty('code', 'gemma3:27b');
      expect(capabilities).toHaveProperty('testgen', 'qwen:latest');
    });
  });
});
