import { describe, it, expect, jest, beforeAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import modelRouter from '../routes/modelRoute';

jest.mock('../providers/openaiProvider', () => ({
  openai: {}
}));

jest.mock('../services/models/ModelRouterService', () => {
  return jest.fn().mockImplementation(() => ({
    route: jest.fn().mockResolvedValue('mocked response'),
    getModelForMode: jest.fn(mode => mode === 'code' ? 'code-davinci-002' : 'gpt-4-turbo')
  }));
});

describe('Model Route API', () => {
  const app = express();

  beforeAll(() => {
    app.use(express.json());
    app.use('/', modelRouter);
  });

  describe('POST /route', () => {
    it('should route prompt and return response', async () => {
      const response = await request(app)
        .post('/route')
        .send({
          prompt: 'test prompt',
          ownerMode: 'code'
        })
        .expect(200);

      expect(response.body).toHaveProperty('reply', 'mocked response');
      expect(response.body).toHaveProperty('model', 'code-davinci-002');
      expect(response.body).toHaveProperty('promptLength', 11);
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
  });

  describe('GET /models', () => {
    it('should return model mappings and configuration', async () => {
      const response = await request(app)
        .get('/models')
        .expect(200);

      expect(response.body).toHaveProperty('modelMappings');
      expect(response.body).toHaveProperty('costThreshold');
      expect(response.body).toHaveProperty('localModel');
      expect(response.body.modelMappings).toHaveProperty('code', 'code-davinci-002');
    });
  });
});
