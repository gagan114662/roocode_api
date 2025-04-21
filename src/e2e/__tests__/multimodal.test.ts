import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import fs from 'fs/promises';
import path from 'path';
import app from '../../api';

describe('Multimodal API Integration', () => {
  const projectId = 'test-project-e2e';
  const workspaceDir = path.join(process.cwd(), 'workspaces', projectId);
  const uploadsDir = path.join(workspaceDir, 'uploads');
  const testImagePath = path.join(__dirname, 'fixtures', 'test.jpg');

  beforeAll(async () => {
    // Set up test directories and files
    await fs.mkdir(path.join(__dirname, 'fixtures'), { recursive: true });
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(testImagePath, Buffer.from('fake image data'));
  });

  afterAll(async () => {
    // Clean up test files
    await fs.rm(workspaceDir, { recursive: true, force: true });
    await fs.rm(path.join(__dirname, 'fixtures'), { recursive: true });
  });

  describe('End-to-end flow', () => {
    it('executes complete multimodal workflow', async () => {
      // 1. Upload test image
      const uploadResponse = await request(app)
        .post(`/api/v1/projects/${projectId}/upload-image`)
        .attach('images', testImagePath)
        .expect(200);

      expect(uploadResponse.body.uploads).toHaveLength(1);
      const uploadedImage = uploadResponse.body.uploads[0];

      // 2. Verify image metadata was created
      const metadataResponse = await request(app)
        .get(`/api/v1/projects/${projectId}/images`)
        .expect(200);

      expect(metadataResponse.body.images).toHaveLength(1);
      expect(metadataResponse.body.images[0].filename).toBe(uploadedImage.filename);

      // 3. Execute planning task with image
      const planResponse = await request(app)
        .post(`/api/v1/projects/${projectId}/plan`)
        .send({
          prompt: 'Analyze this image and suggest code improvements',
          images: [{
            name: uploadedImage.originalName,
            path: uploadedImage.path
          }]
        })
        .expect(200);

      expect(planResponse.body).toHaveProperty('content');
      expect(planResponse.body).toHaveProperty('stages');
      expect(planResponse.body.stages).toHaveProperty('imageAnalysis');

      // 4. Verify the planner executed functions based on image
      if (planResponse.body.functions?.length) {
        expect(planResponse.body.functions[0]).toHaveProperty('name');
        expect(planResponse.body.functions[0]).toHaveProperty('result');
      }

      // 5. Clean up uploaded image
      await request(app)
        .delete(`/api/v1/projects/${projectId}/images/${uploadedImage.filename}`)
        .expect(200);

      // 6. Verify image was deleted
      const finalMetadata = await request(app)
        .get(`/api/v1/projects/${projectId}/images`)
        .expect(200);

      expect(finalMetadata.body.images).toHaveLength(0);
    }, 30000); // Increase timeout for end-to-end test

    it('handles invalid image uploads', async () => {
      const textPath = path.join(__dirname, 'fixtures', 'test.txt');
      await fs.writeFile(textPath, 'not an image');

      await request(app)
        .post(`/api/v1/projects/${projectId}/upload-image`)
        .attach('images', textPath)
        .expect(400);

      await fs.unlink(textPath);
    });

    it('handles missing images in planning', async () => {
      const response = await request(app)
        .post(`/api/v1/projects/${projectId}/plan`)
        .send({
          prompt: 'Analyze image',
          images: [{
            name: 'nonexistent.jpg',
            path: '/invalid/path'
          }]
        })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('maintains conversation history', async () => {
      const history = [
        { role: 'user', content: 'Previous message' },
        { role: 'assistant', content: 'Previous response' }
      ];

      const response = await request(app)
        .post(`/api/v1/projects/${projectId}/plan`)
        .send({
          prompt: 'Continue analysis',
          history
        })
        .expect(200);

      expect(response.body.content).toBeTruthy();
    });

    it('threads conversation with response_id', async () => {
      const responseId = 'prev-response';

      const response = await request(app)
        .post(`/api/v1/projects/${projectId}/plan`)
        .send({
          prompt: 'Continue analysis',
          responseId
        })
        .expect(200);

      expect(response.body.threadId).toBeTruthy();
    });
  });

  describe('Security', () => {
    it('prevents directory traversal in image paths', async () => {
      await request(app)
        .delete(`/api/v1/projects/${projectId}/images/../../../etc/passwd`)
        .expect(403);
    });

    it('validates image file types', async () => {
      const response = await request(app)
        .get(`/api/v1/public/uploads/${projectId}/test.php`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    it('enforces file size limits', async () => {
      const largePath = path.join(__dirname, 'fixtures', 'large.jpg');
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      await fs.writeFile(largePath, largeBuffer);

      await request(app)
        .post(`/api/v1/projects/${projectId}/upload-image`)
        .attach('images', largePath)
        .expect(400);

      await fs.unlink(largePath);
    });
  });
});
