import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { FunctionHandler } from '../FunctionHandler';
import { ValidationError } from '../../../utils/validator';

describe('FunctionHandler', () => {
  let handler: FunctionHandler;
  let projectService: any;
  let memoryService: any;
  let vectorService: any;

  beforeEach(() => {
    projectService = {
      readFile: jest.fn(),
      writeFile: jest.fn()
    };
    memoryService = {
      appendToSection: jest.fn()
    };
    vectorService = {
      search: jest.fn()
    };

    handler = new FunctionHandler(projectService, memoryService, vectorService);
  });

  describe('generateCode', () => {
    it('validates and returns code generation', async () => {
      const mockResponse = {
        content: "console.log('test')",
        language: "typescript",
        metadata: {
          filename: "test.ts",
          description: "Test file"
        }
      };

      jest.spyOn(handler as any, 'callLLM')
        .mockResolvedValue(JSON.stringify(mockResponse));

      const result = await handler.generateCode({
        projectId: 'test',
        prompt: 'Generate test code'
      });

      expect(result.content).toBe("console.log('test')");
      expect(result.metadata.filename).toBe("test.ts");
      expect(memoryService.appendToSection).toHaveBeenCalled();
    });

    it('retries on invalid code generation', async () => {
      const invalidResponse = {
        content: "test",
        // Missing required fields
      };

      const validResponse = {
        content: "console.log('test')",
        language: "typescript",
        metadata: {
          filename: "test.ts",
          description: "Test file"
        }
      };

      jest.spyOn(handler as any, 'callLLM')
        .mockResolvedValueOnce(JSON.stringify(invalidResponse))
        .mockResolvedValueOnce(JSON.stringify(validResponse));

      const result = await handler.generateCode({
        projectId: 'test',
        prompt: 'Generate test code'
      });

      expect(result.content).toBe("console.log('test')");
      expect(handler['callLLM']).toHaveBeenCalledTimes(2);
    });

    it('throws after max retries with invalid output', async () => {
      const invalidResponse = {
        content: "test",
        // Always missing required fields
      };

      jest.spyOn(handler as any, 'callLLM')
        .mockResolvedValue(JSON.stringify(invalidResponse));

      await expect(
        handler.generateCode({
          projectId: 'test',
          prompt: 'Generate test code'
        })
      ).rejects.toThrow('Failed to generate valid output');
    });
  });
});
