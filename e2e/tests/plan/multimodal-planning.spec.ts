import { test, expect } from '../helpers/setup';
import { createTestImage, cleanupTestImage } from '../helpers/image';
import { Image } from '../fixtures/types';
import fs from 'fs/promises';

test.describe('Multimodal Planning', () => {
  let testImage: Image;

  test.beforeEach(async () => {
    testImage = await createTestImage();
  });

  test.afterEach(async () => {
    await cleanupTestImage(testImage);
  });

  test('executes vision-based planning @slow', async ({ request, project }) => {
    // 1. Upload image
    const form = new FormData();
    const fileData = await fs.readFile(testImage.path);
    form.append('images', new Blob([fileData]), testImage.name);

    const uploadResponse = await request.post(
      `/api/v1/projects/${project.id}/upload-image`,
      { data: form }
    );
    expect(uploadResponse.ok()).toBeTruthy();
    
    const { uploads } = await uploadResponse.json();
    const uploadedImage = uploads[0];

    // 2. Execute planning with image
    const planResponse = await request.post(
      `/api/v1/projects/${project.id}/plan`,
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
    const plan = await planResponse.json();
    expect(plan.content).toBeTruthy();
    expect(plan.stages.imageAnalysis).toBeTruthy();
    expect(plan.stages.imageAnalysis.elements).toBeInstanceOf(Array);
  });

  test('handles unknown functions gracefully @fast', async ({ request, project }) => {
    const response = await request.post(
      `/api/v1/projects/${project.id}/plan`,
      {
        data: {
          prompt: 'Execute invalidFunction',
          functions: ['invalidFunction']
        }
      }
    );

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.message).toContain('Unknown function');
  });
});
