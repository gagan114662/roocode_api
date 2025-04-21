import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { MultimodalPlannerAgent } from '../MultimodalPlannerAgent';
import { ProjectService } from '../../project/ProjectService';
import { MemoryService } from '../../memory/MemoryService';
import { VectorContextService } from '../../context/VectorContextService';
import * as openaiProvider from '../../../api/openaiProvider';
import fs from 'fs/promises';
import path from 'path';

jest.mock('../../project/ProjectService');
jest.mock('../../memory/MemoryService');
jest.mock('../../context/VectorContextService');
jest.mock('fs/promises');
jest.mock('../../../api/openaiProvider');

describe('MultimodalPlannerAgent', () => {
  let agent: MultimodalPlannerAgent;
  let projectService: jest.Mocked<ProjectService>;
  let memoryService: jest.Mocked<MemoryService>;
  let vectorService: jest.Mocked<VectorContextService>;
  let chatWithAll: jest.SpyInstance;

  const projectId = 'test-project';
  const testImagePath = '/path/to/test.jpg';
  const testImageData = Buffer.from('test image data');

  beforeEach(() => {
    projectService = new ProjectService() as jest.Mocked<ProjectService>;
    memoryService = new MemoryService() as jest.Mocked<MemoryService>;
    vectorService = new VectorContextService() as jest.Mocked<VectorContextService>;

    agent = new MultimodalPlannerAgent(
      projectId,
      projectService,
      memoryService,
      vectorService
    );

    chatWithAll = jest.spyOn(openaiProvider, 'chatWithAll');
    (fs.readFile as jest.Mock).mockResolvedValue(testImageData);

    jest.clearAllMocks();
  });

  describe('plan with images', () => {
    it('processes images and executes functions', async () => {
      const mockResponse = {
        id: 'response-1',
        message: {
          role: 'assistant',
          content: 'Analysis complete'
        },
        stages: {
          imageAnalysis: {
            message: { content: 'Image analyzed' }
          },
          functionCalls: {
            message: {
              function_call: {
                name: 'writeMemory',
                arguments: JSON.stringify({
                  section: 'decisionLog',
                  entry: 'From image analysis'
                })
              }
            }
          }
        }
      };

      chatWithAll.mockResolvedValueOnce(mockResponse);
      memoryService.appendToSection.mockResolvedValueOnce(undefined);

      const result = await agent.plan(
        'Analyze this image',
        [{ name: 'test.jpg', path: testImagePath }]
      );

      // Verify image loading
      expect(fs.readFile).toHaveBeenCalledWith(testImagePath);

      // Verify response handling
      expect(result.content).toBe('Analysis complete');
      expect(result.stages).toEqual(mockResponse.stages);
      expect(result.functions).toHaveLength(1);
      expect(result.functions[0]).toMatchObject({
        name: 'writeMemory',
        args: {
          section: 'decisionLog',
          entry: 'From image analysis'
        }
      });
    });

    it('handles image loading errors', async () => {
      (fs.readFile as jest.Mock).mockRejectedValueOnce(new Error('File not found'));

      await expect(
        agent.plan('Analyze this', [{ name: 'test.jpg', path: testImagePath }])
      ).rejects.toThrow();

      expect(memoryService.appendToSection).toHaveBeenCalledWith(
        projectId,
        'ciIssues',
        expect.stringContaining('File not found')
      );
    });

    it('validates function arguments from image analysis', async () => {
      const mockResponse = {
        message: { content: 'Analysis complete' },
        stages: {
          functionCalls: {
            message: {
              function_call: {
                name: 'writeMemory',
                arguments: JSON.stringify({
                  section: 'invalidSection',
                  entry: 'test'
                })
              }
            }
          }
        }
      };

      chatWithAll.mockResolvedValueOnce(mockResponse);

      await expect(
        agent.plan('Analyze this', [{ name: 'test.jpg', path: testImagePath }])
      ).rejects.toThrow('Invalid function arguments');
    });
  });

  describe('plan without images', () => {
    it('executes sequential function calls', async () => {
      const responses = [
        {
          id: 'response-1',
          message: {
            role: 'assistant',
            function_call: {
              name: 'readMemory',
              arguments: JSON.stringify({
                section: 'testCoverage'
              })
            }
          }
        },
        {
          id: 'response-2',
          message: {
            role: 'assistant',
            content: 'Task complete'
          }
        }
      ];

      chatWithAll
        .mockResolvedValueOnce(responses[0])
        .mockResolvedValueOnce(responses[1]);

      memoryService.readSection.mockResolvedValue('test coverage data');

      const result = await agent.plan('Execute task');

      expect(result.content).toBe('Task complete');
      expect(result.functions).toHaveLength(1);
      expect(result.functions[0].name).toBe('readMemory');
    });

    it('handles invalid function calls', async () => {
      const mockResponse = {
        message: {
          function_call: {
            name: 'unknownFunction',
            arguments: '{}'
          }
        }
      };

      chatWithAll.mockResolvedValueOnce(mockResponse);

      await expect(agent.plan('Execute task'))
        .rejects.toThrow('Unknown function');
    });
  });

  describe('error handling', () => {
    it('logs execution errors', async () => {
      chatWithAll.mockRejectedValueOnce(new Error('API Error'));

      await expect(agent.plan('Execute task'))
        .rejects.toThrow('API Error');

      expect(memoryService.appendToSection).toHaveBeenCalledWith(
        projectId,
        'ciIssues',
        expect.stringContaining('API Error')
      );
    });

    it('handles function execution errors', async () => {
      const mockResponse = {
        message: {
          function_call: {
            name: 'writeMemory',
            arguments: JSON.stringify({
              section: 'testCoverage',
              entry: 'test'
            })
          }
        }
      };

      chatWithAll.mockResolvedValueOnce(mockResponse);
      memoryService.appendToSection.mockRejectedValueOnce(new Error('Write failed'));

      await expect(agent.plan('Execute task'))
        .rejects.toThrow();

      expect(memoryService.appendToSection).toHaveBeenCalledWith(
        projectId,
        'ciIssues',
        expect.any(String)
      );
    });
  });

  describe('conversation history', () => {
    it('maintains history in requests', async () => {
      const history = [
        { role: 'user', content: 'previous message' },
        { role: 'assistant', content: 'previous response' }
      ];

      chatWithAll.mockResolvedValueOnce({
        message: { content: 'Response with history' }
      });

      await agent.plan('New message', [], history);

      expect(chatWithAll).toHaveBeenCalledWith(
        expect.arrayContaining(history),
        expect.any(Array),
        expect.any(Object)
      );
    });

    it('threads responses with response_id', async () => {
      const responseId = 'prev-response';

      chatWithAll.mockResolvedValueOnce({
        message: { content: 'Threaded response' }
      });

      await agent.plan('Execute task', [], [], responseId);

      expect(chatWithAll).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Array),
        expect.objectContaining({
          response_id: responseId
        })
      );
    });
  });
});
