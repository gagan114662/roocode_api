import { describe, it, expect, jest, beforeAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import modelRouter from '../routes/modelRoute';

jest.mock('../providers/openaiProvider', () => ({
  openai: {}
}));

// Mock fetch for local model health checks
global.fetch = jest.fn();

describe('Model Route API', () => {
  const app = express();

  beforeAll(() => {
    app.use(express.json());
    app.use('/', modelRouter);
  });

  describe('POST /route', () => {
    it('should route prompt and return response with metadata', async () => {
      const response = await request(app)
        .post('/route')
        .send({
          prompt: 'test prompt',
          ownerMode: 'code'
        })
        .expect(200);

      expect(response.body).toHaveProperty('reply');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('selectedModel');
      expect(response.body.metadata).toHaveProperty('localModel');
      expect(response.body.metadata).toHaveProperty('responseTimeMs');
      expect(response.body.metadata.promptLength).toBe(11);
    });

    it('should return 400 for missing fields', async () => {
      await request(app)
        .post('/route')
        .send({ prompt: 'test' })
        .expect(400);

      await request(app)
        .post('/route')
        .send({ ownerMode: 'code' })
        .expect(400);
    });

    it('should validate owner mode and model selection', async () => {
      const response = await request(app)
        .post('/route')
        .send({
          prompt: 'test prompt',
          ownerMode: 'unknown'
        })
        .expect(200);

      expect(response.body.metadata.selectedModel).toBe('gpt-4-turbo');
    });
  });

  describe('GET /models', () => {
    it('should return available models and configuration', async () => {
      const response = await request(app)
        .get('/models')
        .expect(200);

      expect(response.body).toHaveProperty('localModels');
      expect(response.body).toHaveProperty('modelCapabilities');
      expect(response.body).toHaveProperty('config');
      expect(response.body.config).toHaveProperty('costThreshold');
      expect(response.body.config).toHaveProperty('defaultLocalModel');
    });

    it('should include all supported local models', async () => {
      const response = await request(app)
        .get('/models')
        .expect(200);

      expect(response.body.localModels).toContain('llama3:latest');
      expect(response.body.localModels).toContain('gemma3:27b');
      expect(response.body.modelCapabilities).toHaveProperty('code');
    });
  });

  describe('GET /health', () => {
    it('should return healthy status when local model is available', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true
      });

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body.localModelAvailable).toBe(true);
      expect(response.body.openAIAvailable).toBe(true);
    });

    it('should return degraded status when local model is unavailable', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Connection refused')
      );

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body).toHaveProperty('status', 'degraded');
      expect(response.body.localModelAvailable).toBe(false);
      expect(response.body.error).toBe('Connection refused');
    });
  });
});
