import { test, expect } from '../helpers/setup';
import path from 'path';

test.describe('Image Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Common setup
  });

  test('uploads valid images @fast', async ({ request, project }) => {
    // Test implementation
  });

  test.describe('validation', () => {
    test('rejects oversized files', async ({ request, project }) => {
      // Test implementation
    });

    test('validates MIME types @fast', async ({ request, project }) => {
      // Test implementation
    });
  });
});
