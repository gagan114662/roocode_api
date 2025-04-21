import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import planRouter from '../plan';

// Mock services
jest.mock('../../services/project/ProjectService');
jest.mock('../../services/memory/MemoryService');
jest.mock('../../services/context/VectorContextService');

// Mock OpenAI provider
jest.mock('../../api/openaiProvider', () => ({
  chatWithFunctions: jest.fn()
}));

describe('Planning API', () => {
  const app = express();
  const projectId = 'test-project';
  const workspaceDir = path.join(process.cwd(), 'workspaces', projectId);

  beforeAll(async () => {
    app.use(express.json());
    app.use('/', planRouter);

    // Set up test workspace
    await fs.mkdir(workspaceDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(workspaceDir, { recursive: true, force: true });
  });

  describe('POST /projects/:projectId/plan', () => {
    it('executes a plan and returns results', async () => {
      const mockResponse = {
        id: 'response-1',
        message: {
          role: 'assistant',
          content: 'Task completed'
        }
      };

      const mockFunctions = [
        {
          name: 'readMemory',
          args: { section: 'productContext' },
          result: { content: 'Product info' }
        }
      ];

      (global as any).chatWithFunctions.mockResolvedValueOnce(mockResponse);

      const response = await request(app)
        .post(`/projects/${projectId}/plan`)
        .send({
          prompt: 'Test task',
          history: [],
          responseId: 'prev-response'
        })
        .expect(200);

      expect(response.body).toHaveProperty('content', 'Task completed');
      expect(response.body).toHaveProperty('projectId', projectId);
      expect(response.body).toHaveProperty('prompt', 'Test task');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('timestamp');
    });

    it('returns 400 for missing prompt', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/plan`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required field');
    });

    it('handles function execution errors', async () => {
      (global as any).chatWithFunctions.mockRejectedValueOnce(
        new Error('Function failed')
      );

      await request(app)
        .post(`/projects/${projectId}/plan`)
        .send({ prompt: 'Error task' })
        .expect(500);
    });
  });

  describe('GET /projects/:projectId/functions', () => {
    it('returns list of available functions', async () => {
      const response = await request(app)
        .get(`/projects/${projectId}/functions`)
        .expect(200);

      expect(response.body).toHaveProperty('functions');
      expect(Array.isArray(response.body.functions)).toBe(true);
      expect(response.body.functions.length).toBeGreaterThan(0);

      const func = response.body.functions[0];
      expect(func).toHaveProperty('name');
      expect(func).toHaveProperty('description');
      expect(func).toHaveProperty('parameters');
    });
  });

  describe('POST /projects/:projectId/functions/validate', () => {
    it('validates valid function arguments', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/functions/validate`)
        .send({
          name: 'readMemory',
          args: {
            section: 'productContext'
          }
        })
        .expect(200);

      expect(response.body).toEqual({ valid: true });
    });

    it('returns validation errors for invalid arguments', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/functions/validate`)
        .send({
          name: 'readMemory',
          args: {
            section: 'invalidSection'
          }
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('returns 400 for missing required fields', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/functions/validate`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('required');
    });
  });
});
