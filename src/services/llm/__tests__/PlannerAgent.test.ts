import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PlannerAgent } from '../PlannerAgent';
import { ProjectService } from '../../project/ProjectService';
import { MemoryService } from '../../memory/MemoryService';
import { VectorContextService } from '../../context/VectorContextService';
import * as openaiProvider from '../../../api/openaiProvider';

// Mock dependencies
jest.mock('../../project/ProjectService');
jest.mock('../../memory/MemoryService');
jest.mock('../../context/VectorContextService');
jest.mock('../../../api/openaiProvider');

describe('PlannerAgent', () => {
  let agent: PlannerAgent;
  let projectService: jest.Mocked<ProjectService>;
  let memoryService: jest.Mocked<MemoryService>;
  let vectorService: jest.Mocked<VectorContextService>;
  let chatWithFunctions: jest.SpyInstance;

  const projectId = 'test-project';

  beforeEach(() => {
    projectService = new ProjectService() as jest.Mocked<ProjectService>;
    memoryService = new MemoryService() as jest.Mocked<MemoryService>;
    vectorService = new VectorContextService() as jest.Mocked<VectorContextService>;

    agent = new PlannerAgent(
      projectId,
      projectService,
      memoryService,
      vectorService
    );

    chatWithFunctions = jest.spyOn(openaiProvider, 'chatWithFunctions');

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('plan', () => {
    it('executes a simple plan without function calls', async () => {
      chatWithFunctions.mockResolvedValueOnce({
        id: 'response-1',
        message: {
          role: 'assistant',
          content: 'Simple response'
        }
      });

      const result = await agent.plan('simple task');

      expect(result.content).toBe('Simple response');
      expect(result.threadId).toBe('response-1');
      expect(result.functions).toHaveLength(0);
    });

    it('executes function calls and continues conversation', async () => {
      chatWithFunctions
        .mockResolvedValueOnce({
          id: 'response-1',
          message: {
            role: 'assistant',
            function_call: {
              name: 'readMemory',
              arguments: JSON.stringify({
                section: 'productContext'
              })
            }
          }
        })
        .mockResolvedValueOnce({
          id: 'response-2',
          message: {
            role: 'assistant',
            content: 'Context processed'
          }
        });

      memoryService.readSection.mockResolvedValue('Product info');

      const result = await agent.plan('read context');

      expect(result.content).toBe('Context processed');
      expect(result.threadId).toBe('response-2');
      expect(result.functions).toHaveLength(1);
      expect(result.functions[0]).toEqual({
        name: 'readMemory',
        args: {
          projectId,
          section: 'productContext'
        },
        result: { content: 'Product info' }
      });
    });

    it('handles function validation errors', async () => {
      chatWithFunctions
        .mockResolvedValueOnce({
          id: 'response-1',
          message: {
            role: 'assistant',
            function_call: {
              name: 'writeMemory',
              arguments: JSON.stringify({
                section: 'invalidSection',
                entry: 'test'
              })
            }
          }
        })
        .mockResolvedValueOnce({
          id: 'response-2',
          message: {
            role: 'assistant',
            content: 'Error handled'
          }
        });

      const result = await agent.plan('write memory');

      expect(result.content).toBe('Error handled');
      expect(result.functions).toHaveLength(0);
    });

    it('handles function execution errors', async () => {
      chatWithFunctions
        .mockResolvedValueOnce({
          id: 'response-1',
          message: {
            role: 'assistant',
            function_call: {
              name: 'runTests',
              arguments: JSON.stringify({
                testPattern: 'auth'
              })
            }
          }
        })
        .mockResolvedValueOnce({
          id: 'response-2',
          message: {
            role: 'assistant',
            content: 'Test error handled'
          }
        });

      // Simulate execution error
      jest.spyOn(agent as any, 'executeFunction')
        .mockRejectedValueOnce(new Error('Test failed'));

      const result = await agent.plan('run tests');

      expect(result.content).toBe('Test error handled');
      expect(result.functions).toHaveLength(0);
    });

    it('maintains conversation history', async () => {
      const history = [
        { role: 'user', content: 'previous message' },
        { role: 'assistant', content: 'previous response' }
      ];

      chatWithFunctions.mockResolvedValueOnce({
        id: 'response-1',
        message: {
          role: 'assistant',
          content: 'With context'
        }
      });

      const result = await agent.plan('with history', history);

      expect(chatWithFunctions).toHaveBeenCalledWith(
        expect.arrayContaining(history),
        expect.any(Object)
      );
      expect(result.content).toBe('With context');
    });

    it('threads responses with response_id', async () => {
      chatWithFunctions.mockResolvedValueOnce({
        id: 'response-1',
        message: {
          role: 'assistant',
          content: 'Threaded response'
        }
      });

      const result = await agent.plan('thread test', [], 'prev-response');

      expect(chatWithFunctions).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          response_id: 'prev-response'
        })
      );
      expect(result.threadId).toBe('response-1');
    });
  });
});
