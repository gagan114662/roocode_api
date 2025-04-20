import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import memoryRouter from '../memory';

describe('Memory Route', () => {
  const app = express();
  const projectId = 'mem-test';
  const baseDir = path.join(process.cwd(), 'workspaces', projectId, 'memory');

  beforeAll(async () => {
    app.use(express.json());
    app.use('/', memoryRouter);
  });

  afterAll(async () => {
    await fs.rm(path.join(process.cwd(), 'workspaces', projectId), {
      recursive: true,
      force: true
    });
  });

  describe('GET /memory/:projectId/:section', () => {
    it('returns 404 for unknown section', async () => {
      const response = await request(app)
        .get(`/memory/${projectId}/notASection`)
        .expect(404);

      expect(response.body).toEqual({ error: 'Unknown section: notASection' });
    });

    it('returns empty content for a valid but empty section', async () => {
      const response = await request(app)
        .get(`/memory/${projectId}/productContext`)
        .expect(200);

      expect(response.body).toEqual({
        section: 'productContext',
        content: ''
      });
    });

    it('returns appended content after writing to memory', async () => {
      // Manually write to memory file
      await fs.mkdir(baseDir, { recursive: true });
      await fs.writeFile(
        path.join(baseDir, 'decisionLog.md'),
        '- [2025-04-20T00:00:00Z] Test entry\n'
      );

      const response = await request(app)
        .get(`/memory/${projectId}/decisionLog`)
        .expect(200);

      expect(response.body.content).toContain('Test entry');
    });
  });

  describe('GET /memory/:projectId', () => {
    beforeAll(async () => {
      await fs.mkdir(baseDir, { recursive: true });
      await fs.writeFile(
        path.join(baseDir, 'productContext.md'),
        '- [2025-04-20T00:00:00Z] Product info\n'
      );
      await fs.writeFile(
        path.join(baseDir, 'decisionLog.md'),
        '- [2025-04-20T00:00:00Z] Decision made\n'
      );
    });

    it('returns all existing sections and their contents', async () => {
      const response = await request(app)
        .get(`/memory/${projectId}`)
        .expect(200);

      expect(response.body.projectId).toBe(projectId);
      expect(response.body.sections).toHaveLength(2);
      expect(response.body.sections).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            section: 'productContext',
            content: expect.stringContaining('Product info')
          }),
          expect.objectContaining({
            section: 'decisionLog',
            content: expect.stringContaining('Decision made')
          })
        ])
      );
    });

    it('returns empty array when no sections exist', async () => {
      const emptyProjectId = 'empty-project';
      const response = await request(app)
        .get(`/memory/${emptyProjectId}`)
        .expect(200);

      expect(response.body.sections).toEqual([]);
    });
  });

  describe('POST /memory/:projectId/:section', () => {
    it('returns 400 for missing entry content', async () => {
      const response = await request(app)
        .post(`/memory/${projectId}/productContext`)
        .send({})
        .expect(400);

      expect(response.body).toEqual({ error: 'Entry content is required' });
    });

    it('returns 404 for unknown section', async () => {
      const response = await request(app)
        .post(`/memory/${projectId}/notASection`)
        .send({ entry: 'Test entry' })
        .expect(404);

      expect(response.body).toEqual({ error: 'Unknown section: notASection' });
    });

    it('appends entry and returns updated content', async () => {
      const response = await request(app)
        .post(`/memory/${projectId}/implementationNotes`)
        .send({ entry: 'New implementation note' })
        .expect(200);

      expect(response.body.section).toBe('implementationNotes');
      expect(response.body.content).toContain('New implementation note');

      // Verify file was actually written
      const content = await fs.readFile(
        path.join(baseDir, 'implementationNotes.md'),
        'utf-8'
      );
      expect(content).toContain('New implementation note');
    });
  });
});
