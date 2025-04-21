/// <reference types="jest" />

import { ContextService } from '../ContextService';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs.promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  mkdir: jest.fn().mockResolvedValue(undefined)
}));

// Mock glob
jest.mock('glob', () => ({
  glob: jest.fn()
}));

describe('ContextService', () => {
  let contextService: ContextService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    contextService = ContextService.getInstance();
    contextService.clearAllCaches();
  });
  
  describe('indexProject', () => {
    it('should index project files and store chunks', async () => {
      // Mock glob to return some files
      const { glob } = require('glob');
      glob.mockResolvedValue([
        '/project/file1.ts',
        '/project/file2.ts'
      ]);
      
      // Mock readFile to return file content
      (fs.readFile as jest.Mock).mockImplementation((filePath) => {
        if (filePath === '/project/file1.ts') {
          return Promise.resolve('function hello() {\n  console.log("Hello");\n}');
        } else if (filePath === '/project/file2.ts') {
          return Promise.resolve('function world() {\n  console.log("World");\n}');
        }
        return Promise.reject(new Error('File not found'));
      });
      
      await contextService.indexProject('test-project', '/project');
      
      // Check if the project is indexed
      expect(contextService.isProjectIndexed('test-project')).toBe(true);
    });
  });
  
  describe('findRelevantChunks', () => {
    it('should return empty array if project is not indexed', () => {
      const chunks = contextService.findRelevantChunks('non-existent-project', 'hello');
      expect(chunks).toEqual([]);
    });
    
    it('should find relevant chunks based on prompt', async () => {
      // Mock glob to return some files
      const { glob } = require('glob');
      glob.mockResolvedValue(['/project/file1.ts']);
      
      // Mock readFile to return file content
      (fs.readFile as jest.Mock).mockResolvedValue('function hello() {\n  console.log("Hello");\n}');
      
      await contextService.indexProject('test-project', '/project');
      
      const chunks = contextService.findRelevantChunks('test-project', 'hello function');
      
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].content).toContain('hello');
    });
  });
  
  describe('generateContextString', () => {
    it('should generate formatted context string', async () => {
      // Mock glob to return some files
      const { glob } = require('glob');
      glob.mockResolvedValue(['/project/file1.ts']);
      
      // Mock readFile to return file content
      (fs.readFile as jest.Mock).mockResolvedValue('function hello() {\n  console.log("Hello");\n}');
      
      await contextService.indexProject('test-project', '/project');
      
      const contextString = contextService.generateContextString('test-project', 'hello function');
      
      expect(contextString).toContain('relevant code snippets');
      expect(contextString).toContain('file1.ts');
      expect(contextString).toContain('function hello()');
    });
  });
});