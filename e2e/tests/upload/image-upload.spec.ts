import { test, expect } from '../helpers/setup';
import { createTestImage, cleanupTestImage } from '../helpers/image';
import { Image } from '../fixtures/types';
import fs from 'fs/promises';

test.describe('Image Upload', () => {
  let testImage: Image;

  test.beforeEach(async () => {
    testImage = await createTestImage();
  });

  test.afterEach(async () => {
    await cleanupTestImage(testImage);
  });

  test('uploads valid image @fast', async ({ request, project }) => {
    const form = new FormData();
    const fileData = await fs.readFile(testImage.path);
    form.append('images', new Blob([fileData]), testImage.name);

    const response = await request.post(
      `/api/v1/projects/${project.id}/upload-image`,
      {
        data: form
      }
    );

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.uploads).toHaveLength(1);
    expect(data.uploads[0].originalName).toBe(testImage.name);
  });

  test('rejects oversized files', async ({ request, project }) => {
    const largeImage = await createTestImage(6 * 1024 * 1024); // 6MB
    const form = new FormData();
    const fileData = await fs.readFile(largeImage.path);
    form.append('images', new Blob([fileData]), largeImage.name);

    const response = await request.post(
      `/api/v1/projects/${project.id}/upload-image`,
      {
        data: form
      }
    );

    expect(response.status()).toBe(413);
    await cleanupTestImage(largeImage);
  });

  test('validates file types @fast', async ({ request, project }) => {
    const invalidFile = await createTestImage(1024);
    const form = new FormData();
    const fileData = Buffer.from('not an image');
    form.append('images', new Blob([fileData]), 'test.txt');

    const response = await request.post(
      `/api/v1/projects/${project.id}/upload-image`,
      {
        data: form
      }
    );

    expect(response.status()).toBe(415);
    await cleanupTestImage(invalidFile);
  });
});
