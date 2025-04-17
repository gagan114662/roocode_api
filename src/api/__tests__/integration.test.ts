import request from 'supertest';
import { createApp } from '../server';
import express from 'express';

// Mock the modes module
jest.mock('../core/modes', () => ({
  modes: {
    list: () => ([
      {
        slug: 'code',
        name: 'Code',
        capabilities: ['write', 'read']
      }
    ]),
    current: () => ({
      slug: 'code',
      name: 'Code',
      capabilities: ['write', 'read']
    }),
    switch: async (mode: string) => ({
      slug: mode,
      name: mode.charAt(0).toUpperCase() + mode.slice(1),
      capabilities: ['write', 'read']
    })
  }
}));

describe('API Integration Tests', () => {
    let app: express.Application;
    const TEST_API_KEY = 'test-key';

    beforeAll(() => {
        app = createApp();
    });

    describe('Authentication', () => {
        it('should reject requests without authentication', async () => {
            const response = await request(app)
                .get('/api/v1/modes');
            
            expect(response.status).toBe(401);
            expect(response.body.status).toBe('error');
        });

        it('should accept requests with valid API key', async () => {
            const response = await request(app)
                .get('/api/v1/modes')
                .set('X-API-Key', TEST_API_KEY);
            
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
        });
    });

    describe('Chat Endpoints', () => {
        it('should process chat messages', async () => {
            const response = await request(app)
                .post('/api/v1/chat/message')
                .set('X-API-Key', TEST_API_KEY)
                .send({
                    message: 'Hello Roo',
                    mode: 'ask'
                });
            
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.data.response).toBeDefined();
        });

        it('should reject empty messages', async () => {
            const response = await request(app)
                .post('/api/v1/chat/message')
                .set('X-API-Key', TEST_API_KEY)
                .send({});
            
            expect(response.status).toBe(400);
            expect(response.body.status).toBe('error');
        });
    });

    describe('Mode Endpoints', () => {
        it('should list available modes', async () => {
            const response = await request(app)
                .get('/api/v1/modes')
                .set('X-API-Key', TEST_API_KEY);
            
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(Array.isArray(response.body.data.modes)).toBe(true);
        });

        it('should switch modes', async () => {
            const response = await request(app)
                .post('/api/v1/modes/switch')
                .set('X-API-Key', TEST_API_KEY)
                .send({
                    mode: 'code',
                    reason: 'testing'
                });
            
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.data.mode.slug).toBe('code');
        });
    });

    describe('Error Handling', () => {
        it('should handle 404 errors', async () => {
            const response = await request(app)
                .get('/api/v1/nonexistent')
                .set('X-API-Key', TEST_API_KEY);
            
            expect(response.status).toBe(404);
            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Resource not found');
        });

        it('should handle validation errors', async () => {
            const response = await request(app)
                .post('/api/v1/chat/message')
                .set('X-API-Key', TEST_API_KEY)
                .send({});
            
            expect(response.status).toBe(400);
            expect(response.body.status).toBe('error');
        });
    });
});