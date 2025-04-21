import fs from 'fs/promises';
import path from 'path';
import { Image } from '../fixtures/types';

export async function createTestImage(size = 1024): Promise<Image> {
  const name = `test-${Date.now()}.jpg`;
  const testPath = path.join(__dirname, '../fixtures', name);
  
  const imageBuffer = Buffer.alloc(size);
  await fs.writeFile(testPath, imageBuffer);

  return {
    path: testPath,
    name,
    mimeType: 'image/jpeg',
    size
  };
}

export async function cleanupTestImage(image: Image): Promise<void> {
  try {
    await fs.unlink(image.path);
  } catch (err) {
    console.error(`Failed to cleanup test image: ${image.path}`, err);
  }
}
