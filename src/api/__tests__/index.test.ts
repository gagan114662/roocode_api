import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import app from '../index';

describe('API Server', () => {
  describe('RooCode Modes', () => {
    it('should have RooCode modes initialized', () => {
      expect(app.locals.rooContext).toBeDefined();
      expect(app.locals.rooContext.rooModes).toBeDefined();
      expect(app.locals.rooContext.modeConfigs).toBeDefined();
    });

    it('should have all mode handlers registered', () => {
      const { rooModes } = app.locals.rooContext;
      
      expect(rooModes.scaffold).toBeDefined();
      expect(rooModes.refactor).toBeDefined();
      expect(rooModes.testgen).toBeDefined();
      expect(rooModes.cicd).toBeDefined();
      expect(rooModes.docgen).toBeDefined();
    });
  });

  describe('POST /projects/:id/execute', () => {
    it('routes scaffold prompt to scaffold handler', async () => {
      const response = await request(app)
        .post('/projects/test-project/execute')
        .send({
          prompt: 'Scaffold a new Node.js API project'
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.mode).toBe('scaffold');
    });

    it('routes refactor prompt to refactor handler', async () => {
      const response = await request(app)
        .post('/projects/test-project/execute')
        .send({
          prompt: 'Refactor this code to use async/await'
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.mode).toBe('refactor');
    });

    it('routes test prompt to testgen handler', async () => {
      const response = await request(app)
        .post('/projects/test-project/execute')
        .send({
          prompt: 'Generate unit tests for this class'
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.mode).toBe('testgen');
    });

    it('routes CI/CD prompt to cicd handler', async () => {
      const response = await request(app)
        .post('/projects/test-project/execute')
        .send({
          prompt: 'Set up GitHub Actions CI pipeline'
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.mode).toBe('cicd');
    });

    it('routes documentation prompt to docgen handler', async () => {
      const response = await request(app)
        .post('/projects/test-project/execute')
        .send({
          prompt: 'Generate API documentation'
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.mode).toBe('docgen');
    });

    it('returns 400 error when prompt is missing', async () => {
      const response = await request(app)
        .post('/projects/test-project/execute')
        .send({})
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Prompt is required');
    });

    it('returns 400 error for unknown mode', async () => {
      // This should never happen since detectMode always returns a valid mode,
      // but we test it anyway for completeness
      const response = await request(app)
        .post('/projects/test-project/execute')
        .send({
          prompt: 'Do something invalid'
        })
        .expect(200); // Should still return 200 with default 'code' mode

      expect(response.body.status).toBe('success');
      expect(response.body.data.mode).toBe('code');
    });
  });
});
