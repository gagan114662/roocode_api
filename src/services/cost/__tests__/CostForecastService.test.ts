import { describe, it, expect } from '@jest/globals';
import { CostForecastService } from '../CostForecastService';
import { PlanTree } from '../../planner/PlannerAgent';

describe('CostForecastService', () => {
  const svc = new CostForecastService();

  describe('estimatePromptCost', () => {
    it('estimates prompt cost correctly', () => {
      const prompt = 'Hello world'; // 11 chars → 3 tokens
      const cost = svc.estimatePromptCost(prompt, 'gpt-4-turbo');
      expect(cost).toBeCloseTo((3/1000) * 0.015);
    });

    it('uses fallback pricing for unknown models', () => {
      const prompt = 'Test prompt';
      const cost = svc.estimatePromptCost(prompt, 'unknown-model');
      const expectedCost = (Math.ceil(prompt.length / 4) / 1000) * 0.015; // gpt-4-turbo fallback
      expect(cost).toBe(expectedCost);
    });

    it('correctly estimates costs for different models', () => {
      const prompt = 'Test prompt'.repeat(100); // Create a longer prompt
      const gpt4Cost = svc.estimatePromptCost(prompt, 'gpt-4');
      const gpt35Cost = svc.estimatePromptCost(prompt, 'gpt-3.5-turbo');
      
      expect(gpt4Cost).toBeGreaterThan(gpt35Cost);
      expect(gpt4Cost / gpt35Cost).toBeCloseTo(15); // GPT-4 should be 15x more expensive
    });
  });

  describe('estimatePlanCost', () => {
    it('sums costs over a simple plan', () => {
      const plan: PlanTree = {
        planId: '1',
        parent: { id: 0, title: 'Test', description: 'desc', ownerMode: 'code' },
        tasks: [
          { id: 1, parentId: 0, title: 'T1', description: 'Task 1', ownerMode: 'code' },
          { id: 2, parentId: 0, title: 'T2', description: 'Task 2', ownerMode: 'code' }
        ]
      };

      const cost = svc.estimatePlanCost(plan, { code: 'code-davinci-002' });
      expect(cost).toBeGreaterThan(0);
    });

    it('uses model mapping correctly', () => {
      const plan: PlanTree = {
        planId: '1',
        parent: { id: 0, title: 'Root', description: 'Root task', ownerMode: 'code' },
        tasks: [
          { id: 1, parentId: 0, title: 'Task 1', description: 'A', ownerMode: 'code' },
          { id: 2, parentId: 0, title: 'Task 2', description: 'B', ownerMode: 'test' }
        ]
      };

      const costWithMapping = svc.estimatePlanCost(plan, {
        code: 'code-davinci-002',
        test: 'gpt-3.5-turbo'
      });

      const costWithoutMapping = svc.estimatePlanCost(plan); // should use gpt-4-turbo
      
      expect(costWithMapping).not.toBe(costWithoutMapping);
    });
  });

  describe('utility methods', () => {
    it('returns available models', () => {
      const models = svc.getAvailableModels();
      expect(models).toContain('gpt-4');
      expect(models).toContain('gpt-4-turbo');
      expect(models).toContain('code-davinci-002');
    });

    it('returns correct model prices', () => {
      expect(svc.getModelPrice('gpt-4')).toBe(0.03);
      expect(svc.getModelPrice('gpt-4-turbo')).toBe(0.015);
      expect(svc.getModelPrice('unknown-model')).toBe(0.015); // fallback
    });
  });
});
