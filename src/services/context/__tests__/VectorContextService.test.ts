import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { VectorContextService } from '../VectorContextService';
import fs from 'fs/promises';
import path from 'path';

// Mock dependencies
jest.mock('@pinecone-database/pinecone', () => ({
  PineconeClient: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    Index: jest.fn().mockReturnValue({
      upsert: jest.fn(),
      query: jest.fn(),
      delete1: jest.fn()
    })
  }))
}));

jest.mock('../../../providers/openaiProvider', () => ({
  openai: {
    embeddings: {
      create: jest.fn().mockImplementation(async () => ({
        data: [{ embedding: new Array(1536).fill(0) }]
      }))
    }
  }
}));

jest.mock('glob', () => ({
  glob: jest.fn()
}));

describe('VectorContextService', () => {
  let service: VectorContextService;
  const projectId = 'test-project';
  const workspacePath = path.join(process.cwd(), 'workspaces', projectId);

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VectorContextService();
  });

  describe('indexProject', () => {
    it('processes and indexes project files correctly', async () => {
      // Mock file system
      const mockFiles = ['file1.ts', 'file2.js'];
      const mockContent = 'function test() {\n  return true;\n}\n'.repeat(5);
      
      (global as any).glob.mockResolvedValue(mockFiles);
      jest.spyOn(fs, 'readFile').mockResolvedValue(mockContent);

      const result = await service.indexProject(projectId);

      expect(result).toBeGreaterThan(0); // Should have processed some chunks
      expect(fs.readFile).toHaveBeenCalledTimes(mockFiles.length);
      
      const pineconeIndex = (service as any).pinecone.Index();
      expect(pineconeIndex.upsert).toHaveBeenCalled();
    });

    it('handles empty projects gracefully', async () => {
      (global as any).glob.mockResolvedValue([]);

      const result = await service.indexProject(projectId);

      expect(result).toBe(0);
      const pineconeIndex = (service as any).pinecone.Index();
      expect(pineconeIndex.upsert).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('returns formatted search results', async () => {
      const mockMatches = [
        {
          metadata: { text: 'code snippet 1', file: 'file1.ts' },
          score: 0.9
        },
        {
          metadata: { text: 'code snippet 2', file: 'file2.ts' },
          score: 0.8
        }
      ];

      const pineconeIndex = (service as any).pinecone.Index();
      pineconeIndex.query.mockResolvedValue({ matches: mockMatches });

      const results = await service.search(projectId, 'test query');

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        text: 'code snippet 1',
        file: 'file1.ts',
        score: 0.9
      });
    });

    it('handles no results gracefully', async () => {
      const pineconeIndex = (service as any).pinecone.Index();
      pineconeIndex.query.mockResolvedValue({ matches: [] });

      const results = await service.search(projectId, 'no matches');

      expect(results).toEqual([]);
    });
  });

  describe('deleteProjectVectors', () => {
    it('deletes vectors with correct project filter', async () => {
      await service.deleteProjectVectors(projectId);

      const pineconeIndex = (service as any).pinecone.Index();
      expect(pineconeIndex.delete1).toHaveBeenCalledWith({
        filter: { projectId: { $eq: projectId } }
      });
    });
  });

  describe('chunkText', () => {
    it('respects maxChunkSize while preserving line boundaries', () => {
      const text = 'Line 1\nLine 2\nLong line 3'.repeat(10);
      const chunks = (service as any).chunkText(text, 50);

      chunks.forEach(chunk => {
        expect(chunk.length).toBeLessThanOrEqual(50);
        expect(chunk.endsWith('\n')).toBeFalsy(); // Should be trimmed
      });
    });

    it('handles empty input', () => {
      const chunks = (service as any).chunkText('');
      expect(chunks).toEqual([]);
    });

    it('preserves code structure in chunks', () => {
      const code = `
        function test() {
          const x = 1;
          return x + 2;
        }
      `.trim();

      const chunks = (service as any).chunkText(code, 100);
      expect(chunks[0]).toContain('function test()');
    });
  });
});
