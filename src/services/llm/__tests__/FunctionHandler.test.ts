import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { FunctionHandler } from '../FunctionHandler';
import { ProjectService } from '../../project/ProjectService';
import { MemoryService } from '../../memory/MemoryService';
import { VectorContextService } from '../../context/VectorContextService';
import { exec } from 'child_process';

// Mock dependencies
jest.mock('child_process', () => ({
  exec: jest.fn()
}));

jest.mock('../../project/ProjectService');
jest.mock('../../memory/MemoryService');
jest.mock('../../context/VectorContextService');

describe('FunctionHandler', () => {
  let handler: FunctionHandler;
  let projectService: jest.Mocked<ProjectService>;
  let memoryService: jest.Mocked<MemoryService>;
  let vectorService: jest.Mocked<VectorContextService>;

  const projectId = 'test-project';

  beforeEach(() => {
    projectService = new ProjectService() as jest.Mocked<ProjectService>;
    memoryService = new MemoryService() as jest.Mocked<MemoryService>;
    vectorService = new VectorContextService() as jest.Mocked<VectorContextService>;

    handler = new FunctionHandler(
      projectService,
      memoryService,
      vectorService
    );

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('runTests', () => {
    it('executes tests and logs success result', async () => {
      const mockExec = exec as jest.MockedFunction<typeof exec>;
      mockExec.mockImplementation((cmd, opts, callback) => {
        callback?.(null, { stdout: 'Tests passed', stderr: '' }, '');
        return {} as any;
      });

      const result = await handler.runTests({
        projectId,
        testPattern: 'auth',
        updateSnapshots: true
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Tests passed');
      expect(memoryService.appendToSection).toHaveBeenCalledWith(
        projectId,
        'testCoverage',
        expect.stringContaining('succeeded')
      );
    });

    it('handles test failures', async () => {
      const mockExec = exec as jest.MockedFunction<typeof exec>;
      mockExec.mockImplementation((cmd, opts, callback) => {
        callback?.(new Error('Test failed'), { stdout: '', stderr: 'Failed tests' }, '');
        return {} as any;
      });

      const result = await handler.runTests({ projectId });

      expect(result.success).toBe(false);
      expect(result.output).toContain('Test execution failed');
      expect(memoryService.appendToSection).toHaveBeenCalledWith(
        projectId,
        'ciIssues',
        expect.stringContaining('failed')
      );
    });
  });

  describe('file operations', () => {
    it('reads file content', async () => {
      projectService.readFile.mockResolvedValue('file content');

      const result = await handler.getFileContent({
        projectId,
        filePath: 'test.ts'
      });

      expect(result.content).toBe('file content');
    });

    it('writes file content and logs update', async () => {
      projectService.writeFile.mockResolvedValue(undefined);

      const result = await handler.writeFile({
        projectId,
        filePath: 'test.ts',
        content: 'new content'
      });

      expect(result.success).toBe(true);
      expect(result.path).toBe('test.ts');
      expect(memoryService.appendToSection).toHaveBeenCalledWith(
        projectId,
        'implementationNotes',
        expect.stringContaining('test.ts')
      );
    });

    it('handles file write errors', async () => {
      projectService.writeFile.mockRejectedValue(new Error('Write failed'));

      await expect(
        handler.writeFile({
          projectId,
          filePath: 'test.ts',
          content: 'new content'
        })
      ).rejects.toThrow('Failed to write file');
    });
  });

  describe('version control', () => {
    it('commits changes and logs commit info', async () => {
      projectService.commit.mockResolvedValue('abc123');

      const result = await handler.commitChanges({
        projectId,
        message: 'test commit',
        files: ['test.ts']
      });

      expect(result.success).toBe(true);
      expect(result.commit).toBe('abc123');
      expect(memoryService.appendToSection).toHaveBeenCalledWith(
        projectId,
        'implementationNotes',
        expect.stringContaining('abc123')
      );
    });
  });

  describe('code search', () => {
    it('performs semantic search with vector service', async () => {
      const mockResults = [
        { text: 'code1', file: 'file1.ts', score: 0.9 }
      ];
      vectorService.search.mockResolvedValue(mockResults);

      const result = await handler.searchCode({
        projectId,
        query: 'test query'
      });

      expect(result.results).toEqual(mockResults);
      expect(vectorService.search).toHaveBeenCalledWith(
        projectId,
        'test query',
        5
      );
    });
  });

  describe('memory operations', () => {
    it('reads memory sections', async () => {
      memoryService.readSection.mockResolvedValue('memory content');

      const result = await handler.readMemory({
        projectId,
        section: 'testCoverage'
      });

      expect(result.content).toBe('memory content');
    });

    it('writes to memory sections', async () => {
      memoryService.appendToSection.mockResolvedValue(undefined);

      const result = await handler.writeMemory({
        projectId,
        section: 'decisionLog',
        entry: 'new decision'
      });

      expect(result.success).toBe(true);
      expect(memoryService.appendToSection).toHaveBeenCalledWith(
        projectId,
        'decisionLog',
        'new decision'
      );
    });
  });
});
