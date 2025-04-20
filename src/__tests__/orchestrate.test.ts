import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import orchestrateRouter from '../routes/orchestrate';

// Mock dependencies
jest.mock('../providers/openaiProvider', () => ({
  openai: {}
}));

jest.mock('../services/models/ModelRouterService', () => {
  return jest.fn().mockImplementation(() => ({
    route: jest.fn().mockImplementation((prompt, mode) => {
      if (mode === 'code') return 'function test() { return true; }';
      if (mode === 'testgen') return 'test("test", () => { expect(test()).toBe(true); });';
      return 'mocked response';
    })
  }));
});

describe('Orchestration API', () => {
  const app = express();
  const projectId = 'test-project';
  const workspaceDir = path.join(process.cwd(), 'workspaces', projectId);

  const testPlan = {
    id: 1,
    description: 'Root task',
    ownerMode: 'code',
    children: [
      {
        id: 2,
        description: 'Write tests',
        ownerMode: 'testgen',
        children: []
      }
    ]
  };

  beforeAll(async () => {
    app.use(express.json());
    app.use('/', orchestrateRouter);

    // Set up test workspace
    await fs.mkdir(workspaceDir, { recursive: true });
    await fs.writeFile(
      path.join(workspaceDir, 'plan.json'),
      JSON.stringify(testPlan)
    );
  });

  afterAll(async () => {
    await fs.rm(workspaceDir, { recursive: true, force: true });
  });

  describe('POST /projects/:projectId/orchestrate', () => {
    it('executes a plan and returns results with metadata', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/orchestrate`)
        .send({
          context: 'Test context',
          modelMap: {
            code: 'code-davinci-002',
            testgen: 'gpt-4-turbo'
          }
        })
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('estimatedCostUSD');
      expect(response.body.metadata).toHaveProperty('executionTimeMs');
      expect(response.body.metadata.taskCount).toBe(2);

      // Verify execution results
      expect(response.body.results.taskId).toBe(1);
      expect(response.body.results.ownerMode).toBe('code');
      expect(response.body.results.children).toHaveLength(1);
      expect(response.body.results.children[0].ownerMode).toBe('testgen');
    });

    it('returns 400 for invalid plan configuration', async () => {
      const invalidPlan = {
        id: 1,
        description: 'Root task',
        ownerMode: 'invalid-mode',
        children: []
      };

      await fs.writeFile(
        path.join(workspaceDir, 'plan.json'),
        JSON.stringify(invalidPlan)
      );

      const response = await request(app)
        .post(`/projects/${projectId}/orchestrate`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid plan configuration');
      expect(response.body.details).toContain('No agent found for mode: invalid-mode');
    });

    it('returns 404 for non-existent project', async () => {
      const response = await request(app)
        .post('/projects/non-existent/orchestrate')
        .send({})
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('No plan found');
    });
  });

  describe('GET /projects/:projectId/estimate', () => {
    it('returns cost estimate and task count', async () => {
      const response = await request(app)
        .get(`/projects/${projectId}/estimate`)
        .query({
          modelMap: {
            code: 'code-davinci-002',
            testgen: 'gpt-4-turbo'
          }
        })
        .expect(200);

      expect(response.body).toHaveProperty('projectId', projectId);
      expect(response.body).toHaveProperty('estimatedCostUSD');
      expect(response.body).toHaveProperty('taskCount', 2);
      expect(response.body).toHaveProperty('modelMap');
      expect(Number(response.body.estimatedCostUSD)).toBeGreaterThan(0);
    });

    it('validates plan before estimation', async () => {
      const invalidPlan = {
        id: 1,
        description: '',  // Missing required field
        ownerMode: 'code',
        children: []
      };

      await fs.writeFile(
        path.join(workspaceDir, 'plan.json'),
        JSON.stringify(invalidPlan)
      );

      const response = await request(app)
        .get(`/projects/${projectId}/estimate`)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid plan configuration');
      expect(response.body.details).toContain('Missing description for task 1');
    });
  });
});
