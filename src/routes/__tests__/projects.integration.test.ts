import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createTestServer } from '../../api/test-server';
import express from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Projects Routes - Intent Router Integration', () => {
  let app: express.Application;
  const testProjectId = 'test-intent-router-project';
  const testWorkspacesDir = path.join(__dirname, '..', '..', '..', 'test-workspaces');
  const testProjectPath = path.join(testWorkspacesDir, testProjectId);

  // Setup test environment
  beforeAll(async () => {
    // Set test environment variables
    process.env.WORKSPACE_PATH = testWorkspacesDir;
    process.env.NODE_ENV = 'test';

    // Create test workspaces directory
    await fs.mkdir(testWorkspacesDir, { recursive: true });

    // Create the app with test configuration
    app = createTestServer();
    
    // Initialize test project
    await request(app)
      .post(`/projects/${testProjectId}/init`)
      .expect(200);
  }, 30000);

  // Clean up test environment
  afterAll(async () => {
    // Remove test project directory
    try {
      await fs.rm(testProjectPath, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up test project:', error);
    }
  }, 30000);

  // Test intent detection and routing
  describe('POST /projects/:projectId/execute', () => {
    it('should detect scaffold intent and route to scaffold handler', async () => {
      const response = await request(app)
        .post(`/projects/${testProjectId}/execute`)
        .send({ prompt: 'Please scaffold a new React project' })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.mode).toBe('scaffold');
    });

    it('should detect refactor intent and route to refactor handler', async () => {
      const response = await request(app)
        .post(`/projects/${testProjectId}/execute`)
        .send({ prompt: 'Refactor this code to use async/await' })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.mode).toBe('refactor');
    });

    it('should detect testgen intent and route to testgen handler', async () => {
      const response = await request(app)
        .post(`/projects/${testProjectId}/execute`)
        .send({ prompt: 'Generate unit tests for this class' })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.mode).toBe('testgen');
    });

    it('should detect cicd intent and route to cicd handler', async () => {
      const response = await request(app)
        .post(`/projects/${testProjectId}/execute`)
        .send({ prompt: 'Set up a GitHub Action for CI/CD' })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.mode).toBe('cicd');
    });

    it('should detect docgen intent and route to docgen handler', async () => {
      const response = await request(app)
        .post(`/projects/${testProjectId}/execute`)
        .send({ prompt: 'Generate documentation for the API' })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.mode).toBe('docgen');
    });

    it('should use code mode as default and route to code handler', async () => {
      const response = await request(app)
        .post(`/projects/${testProjectId}/execute`)
        .send({ prompt: 'Implement a login feature' })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.mode).toBe('code');
    });

    it('should return 400 if prompt is missing', async () => {
      const response = await request(app)
        .post(`/projects/${testProjectId}/execute`)
        .send({})
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Prompt is required');
    });
  });
});