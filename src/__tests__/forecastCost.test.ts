import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import forecastRouter from '../routes/forecastCost';
import fs from 'fs/promises';
import path from 'path';

describe('Forecast Cost API', () => {
  const app = express();
  const testProjectId = 'test-project';
  const workspaceDir = path.join(process.cwd(), 'workspaces', testProjectId);
  const testPlan = {
    planId: '1',
    parent: { id: 0, title: 'Root', description: 'Root task', ownerMode: 'code' },
    tasks: [
      { id: 1, parentId: 0, title: 'Task 1', description: 'A', ownerMode: 'code' },
      { id: 2, parentId: 0, title: 'Task 2', description: 'B', ownerMode: 'test' }
    ]
  };

  beforeAll(async () => {
    app.use(express.json());
    app.use('/', forecastRouter);
    await fs.mkdir(workspaceDir, { recursive: true });
    await fs.writeFile(
      path.join(workspaceDir, 'plan.json'),
      JSON.stringify(testPlan)
    );
  });

  afterAll(async () => {
    await fs.rm(workspaceDir, { recursive: true, force: true });
  });

  it('returns estimated cost and metadata', async () => {
    const response = await request(app)
      .get(`/projects/${testProjectId}/forecast-cost`)
      .expect(200);

    expect(response.body).toHaveProperty('estimatedCostUSD');
    expect(response.body).toHaveProperty('models');
    expect(response.body).toHaveProperty('modelPrices');
    expect(response.body).toHaveProperty('taskCount');
    expect(response.body.taskCount).toBe(2);
    expect(Number(response.body.estimatedCostUSD)).toBeGreaterThan(0);
  });

  it('handles custom model mapping', async () => {
    const response = await request(app)
      .get(`/projects/${testProjectId}/forecast-cost`)
      .send({
        modelMap: {
          code: 'code-davinci-002',
          test: 'gpt-3.5-turbo'
        }
      })
      .expect(200);

    expect(response.body).toHaveProperty('modelMap');
    expect(response.body.modelMap).toHaveProperty('code', 'code-davinci-002');
  });

  it('returns 404 for non-existent project', async () => {
    const response = await request(app)
      .get('/projects/non-existent/forecast-cost')
      .expect(404);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('No plan found');
  });
});
