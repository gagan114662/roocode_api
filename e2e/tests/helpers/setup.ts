import { test as base } from '@playwright/test';
import { ProjectFixture } from './fixtures';

export const test = base.extend<{
  project: ProjectFixture;
}>({
  project: async ({ request }, use) => {
    const projectId = `test-${Date.now()}`;
    await use({ id: projectId });
    // Cleanup after tests
    await request.delete(`/api/v1/projects/${projectId}`);
  }
});

export { expect } from '@playwright/test';
