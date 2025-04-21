import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import uploadRouter from '../upload';

describe('Upload API', () => {
  const app = express();
  const projectId = 'test-project';
  const workspaceDir = path.join(process.cwd(), 'workspaces', projectId);
  const uploadsDir = path.join(workspaceDir, 'uploads');

  beforeAll(async () => {
    app.use(express.json());
    app.use('/', uploadRouter);
    await fs.mkdir(workspaceDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(workspaceDir, { recursive: true, force: true });
  });

  describe('POST /projects/:projectId/upload-image', () => {
    const testImagePath = path.join(__dirname, 'fixtures', 'test.jpg');

    beforeAll(async () => {
      // Create test image fixture
      await fs.mkdir(path.join(__dirname, 'fixtures'), { recursive: true });
      await fs.writeFile(testImagePath, Buffer.from('fake image data'));
    });

    afterAll(async () => {
      await fs.unlink(testImagePath);
      await fs.rmdir(path.join(__dirname, 'fixtures'));
    });

    it('uploads and processes single image', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/upload-image`)
        .attach('images', testImagePath)
        .expect(200);

      expect(response.body).toHaveProperty('uploads');
      expect(response.body.uploads).toHaveLength(1);
      expect(response.body.uploads[0]).toHaveProperty('filename');
      expect(response.body.uploads[0]).toHaveProperty('path');
      expect(response.body.uploads[0]).toHaveProperty('size');

      // Verify file was saved
      const savedPath = response.body.uploads[0].path;
      const fileExists = await fs.access(savedPath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      // Verify metadata was updated
      const metadataPath = path.join(uploadsDir, 'metadata.json');
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
      expect(metadata.uploads).toHaveLength(1);
      expect(metadata.uploads[0]).toMatchObject({
        projectId,
        filename: response.body.uploads[0].filename
      });
    });

    it('handles multiple images', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/upload-image`)
        .attach('images', testImagePath)
        .attach('images', testImagePath)
        .expect(200);

      expect(response.body.uploads).toHaveLength(2);
      expect(response.body.metadata.totalFiles).toBe(2);
    });

    it('validates file type', async () => {
      const textPath = path.join(__dirname, 'fixtures', 'test.txt');
      await fs.writeFile(textPath, 'not an image');

      const response = await request(app)
        .post(`/projects/${projectId}/upload-image`)
        .attach('images', textPath)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Only image files');

      await fs.unlink(textPath);
    });

    it('enforces file size limit', async () => {
      const largePath = path.join(__dirname, 'fixtures', 'large.jpg');
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      await fs.writeFile(largePath, largeBuffer);

      const response = await request(app)
        .post(`/projects/${projectId}/upload-image`)
        .attach('images', largePath)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('File too large');

      await fs.unlink(largePath);
    });
  });

  describe('GET /projects/:projectId/images', () => {
    it('returns image metadata', async () => {
      const response = await request(app)
        .get(`/projects/${projectId}/images`)
        .expect(200);

      expect(response.body).toHaveProperty('images');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('totalFiles');
      expect(response.body.metadata).toHaveProperty('totalSize');
    });

    it('handles missing metadata gracefully', async () => {
      await fs.rm(uploadsDir, { recursive: true, force: true });

      const response = await request(app)
        .get(`/projects/${projectId}/images`)
        .expect(200);

      expect(response.body.images).toEqual([]);
      expect(response.body.metadata.totalFiles).toBe(0);
    });
  });

  describe('DELETE /projects/:projectId/images/:filename', () => {
    it('deletes image and updates metadata', async () => {
      // First upload an image
      const uploadResponse = await request(app)
        .post(`/projects/${projectId}/upload-image`)
        .attach('images', path.join(__dirname, 'fixtures', 'test.jpg'))
        .expect(200);

      const filename = uploadResponse.body.uploads[0].filename;

      // Then delete it
      const deleteResponse = await request(app)
        .delete(`/projects/${projectId}/images/${filename}`)
        .expect(200);

      expect(deleteResponse.body).toHaveProperty('deleted', true);

      // Verify file was deleted
      const filePath = path.join(uploadsDir, filename);
      const fileExists = await fs.access(filePath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(false);

      // Verify metadata was updated
      const metadataPath = path.join(uploadsDir, 'metadata.json');
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
      expect(metadata.uploads.find(u => u.filename === filename)).toBeUndefined();
    });

    it('handles missing files gracefully', async () => {
      const response = await request(app)
        .delete(`/projects/${projectId}/images/nonexistent.jpg`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});
