import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import searchRouter from '../search';

// Mock VectorContextService
jest.mock('../../services/context/VectorContextService', () => {
  return jest.fn().mockImplementation(() => ({
    search: jest.fn().mockImplementation(async (projectId, query, topK) => {
      return [
        {
          text: 'function searchTest() { return true; }',
          file: 'search.ts',
          score: 0.95
        },
        {
          text: 'class SearchService { /* ... */ }',
          file: 'service.ts',
          score: 0.85
        }
      ].slice(0, topK);
    }),
    indexProject: jest.fn().mockResolvedValue(42),
    deleteProjectVectors: jest.fn().mockResolvedValue(undefined)
  }));
});

describe('Search API', () => {
  const app = express();
  const projectId = 'test-project';
  const workspaceDir = path.join(process.cwd(), 'workspaces', projectId);

  beforeAll(async () => {
    app.use(express.json());
    app.use('/', searchRouter);

    // Set up test workspace
    await fs.mkdir(workspaceDir, { recursive: true });
    await fs.writeFile(
      path.join(workspaceDir, 'test.ts'),
      'function test() { return true; }'
    );
  });

  afterAll(async () => {
    await fs.rm(workspaceDir, { recursive: true, force: true });
  });

  describe('GET /projects/:projectId/search', () => {
    it('returns search results with metadata', async () => {
      const response = await request(app)
        .get(`/projects/${projectId}/search`)
        .query({ q: 'test query', k: '2' })
        .expect(200);

      expect(response.body).toHaveProperty('query', 'test query');
      expect(response.body).toHaveProperty('topK', 2);
      expect(response.body).toHaveProperty('results');
      expect(response.body.results).toHaveLength(2);
      expect(response.body.metadata).toHaveProperty('resultCount', 2);
      expect(response.body.metadata).toHaveProperty('projectId', projectId);
      expect(response.body.metadata).toHaveProperty('timestamp');

      // Verify result structure
      const result = response.body.results[0];
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('file');
      expect(result).toHaveProperty('score');
    });

    it('returns 400 for missing query', async () => {
      const response = await request(app)
        .get(`/projects/${projectId}/search`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required query parameter');
    });

    it('uses default topK when not provided', async () => {
      const response = await request(app)
        .get(`/projects/${projectId}/search`)
        .query({ q: 'test' })
        .expect(200);

      expect(response.body).toHaveProperty('topK', 5);
    });
  });

  describe('POST /projects/:projectId/index', () => {
    it('indexes project and returns metadata', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/index`)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('projectId', projectId);
      expect(response.body.metadata).toHaveProperty('chunkCount', 42);
      expect(response.body.metadata).toHaveProperty('cleaned', false);
      expect(response.body.metadata).toHaveProperty('timestamp');
    });

    it('cleans existing vectors when requested', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/index`)
        .query({ clean: 'true' })
        .expect(200);

      expect(response.body.metadata).toHaveProperty('cleaned', true);
    });
  });

  describe('DELETE /projects/:projectId/vectors', () => {
    it('deletes project vectors', async () => {
      const response = await request(app)
        .delete(`/projects/${projectId}/vectors`)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('projectId', projectId);
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('timestamp');
    });
  });
});
