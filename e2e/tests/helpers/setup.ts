import { test as base } from '@playwright/test';
import { ProjectFixture } from '../fixtures/types';
import { createProject, deleteProject } from './project';

// Extend base test with fixtures
export const test = base.extend<{
  project: ProjectFixture;
}>({
  project: async ({ request }, use) => {
    const projectId = `test-${Date.now()}`;
    const project = await createProject(request, projectId);
    await use(project);
    await deleteProject(request, projectId);
  }
});

export { expect } from '@playwright/test';
