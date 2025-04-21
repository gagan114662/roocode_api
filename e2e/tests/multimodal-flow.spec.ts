import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';

test.describe('Multimodal Planning Flow', () => {
  const testProjectId = process.env.TEST_PROJECT_ID;
  const testImagePath = path.join(__dirname, '../fixtures/test.jpg');

  test('complete project workflow', async ({ request }) => {
    // 1. Upload test image
    const imageForm = new FormData();
    const imageFile = await fs.readFile(testImagePath);
    imageForm.append('images', new Blob([imageFile]), 'test.jpg');

    const uploadResponse = await request.post(
      `/api/v1/projects/${testProjectId}/upload-image`,
      {
        data: imageForm
      }
    );
    expect(uploadResponse.ok()).toBeTruthy();
    
    const uploadData = await uploadResponse.json();
    expect(uploadData.uploads).toHaveLength(1);
    const uploadedImage = uploadData.uploads[0];

    // 2. Execute planning with image
    const planResponse = await request.post(
      `/api/v1/projects/${testProjectId}/plan`,
      {
        data: {
          prompt: 'Analyze this screenshot and suggest improvements',
          images: [{
            name: uploadedImage.originalName,
            path: uploadedImage.path
          }]
        }
      }
    );
    expect(planResponse.ok()).toBeTruthy();

    const planData = await planResponse.json();
    expect(planData.content).toBeTruthy();
    expect(planData.stages?.imageAnalysis).toBeTruthy();

    // 3. Verify image metadata
    const metadataResponse = await request.get(
      `/api/v1/projects/${testProjectId}/images`
    );
    expect(metadataResponse.ok()).toBeTruthy();

    const metadataData = await metadataResponse.json();
    expect(metadataData.images).toContainEqual(
      expect.objectContaining({
        filename: uploadedImage.filename
      })
    );

    // 4. Clean up
    const deleteResponse = await request.delete(
      `/api/v1/projects/${testProjectId}/images/${uploadedImage.filename}`
    );
    expect(deleteResponse.ok()).toBeTruthy();
  });

  test('security validations', async ({ request }) => {
    // Test file size limit
    const largeForm = new FormData();
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024);
    largeForm.append('images', new Blob([largeBuffer]), 'large.jpg');

    const largeResponse = await request.post(
      `/api/v1/projects/${testProjectId}/upload-image`,
      {
        data: largeForm
      }
    );
    expect(largeResponse.status()).toBe(400);

    // Test file type validation
    const textForm = new FormData();
    textForm.append('images', new Blob(['not an image']), 'test.txt');

    const textResponse = await request.post(
      `/api/v1/projects/${testProjectId}/upload-image`,
      {
        data: textForm
      }
    );
    expect(textResponse.status()).toBe(400);

    // Test path traversal
    const traversalResponse = await request.delete(
      `/api/v1/projects/${testProjectId}/images/../../../etc/passwd`
    );
    expect(traversalResponse.status()).toBe(403);
  });

  test('error handling', async ({ request }) => {
    // Test missing image
    const planResponse = await request.post(
      `/api/v1/projects/${testProjectId}/plan`,
      {
        data: {
          prompt: 'Analyze image',
          images: [{
            name: 'nonexistent.jpg',
            path: '/invalid/path'
          }]
        }
      }
    );
    expect(planResponse.status()).toBe(500);
    expect(await planResponse.json()).toHaveProperty('error');
  });
});
