import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { OpenAIApi } from 'openai';
import { MemoryService } from '../../memory/MemoryService';
import { PlannerAgent } from '../PlannerAgent';

jest.mock('../../memory/MemoryService');
jest.mock('openai');

describe('PlannerAgent Memory Integration', () => {
  let planner: PlannerAgent;
  const mockOpenAI = {} as OpenAIApi;
  const projectId = 'test-project';

  beforeEach(() => {
    jest.resetAllMocks();
    planner = new PlannerAgent(mockOpenAI);
  });

  describe('createPlanTree', () => {
    it('should prepend existing context to prompt', async () => {
      const existingContext = 'Previous project details';
      const prompt = 'Create a new feature';

      (MemoryService.prototype.readSection as jest.Mock)
        .mockResolvedValue(existingContext);

      await planner.createPlanTree(projectId, prompt);

      expect(MemoryService.prototype.readSection)
        .toHaveBeenCalledWith(projectId, 'productContext');
      expect(MemoryService.prototype.appendToSection)
        .toHaveBeenCalledWith(
          projectId,
          'decisionLog',
          expect.stringContaining('Generated plan for: Create a new feature')
        );
    });

    it('should use raw prompt when no context exists', async () => {
      const prompt = 'Create a new feature';
      
      (MemoryService.prototype.readSection as jest.Mock)
        .mockResolvedValue('');

      await planner.createPlanTree(projectId, prompt);

      expect(MemoryService.prototype.appendToSection)
        .toHaveBeenCalledWith(
          projectId,
          'decisionLog',
          expect.stringContaining('Generated plan for: Create a new feature')
        );
    });
  });

  describe('executePlanStep', () => {
    it('should log successful step execution', async () => {
      const step = { id: 1, title: 'Test Step' };

      await planner.executePlanStep(projectId, step);

      expect(MemoryService.prototype.appendToSection)
        .toHaveBeenCalledWith(
          projectId,
          'implementationNotes',
          expect.stringContaining('Completed step: Test Step')
        );
    });

    it('should log failed step execution', async () => {
      const step = { id: 1, title: 'Failed Step' };
      const error = new Error('Test error');

      // Mock implementation to throw
      jest.spyOn(planner as any, 'executeStep')
        .mockRejectedValue(error);

      await expect(planner.executePlanStep(projectId, step))
        .rejects.toThrow('Test error');

      expect(MemoryService.prototype.appendToSection)
        .toHaveBeenCalledWith(
          projectId,
          'ciIssues',
          expect.stringContaining('Failed step: Failed Step')
        );
    });
  });
});
