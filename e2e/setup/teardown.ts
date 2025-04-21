import { FullConfig } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  const testProjectId = process.env.TEST_PROJECT_ID;
  if (testProjectId) {
    const workspaceDir = path.join(process.cwd(), 'workspaces', testProjectId);
    await fs.rm(workspaceDir, { recursive: true, force: true });
  }

  const fixturesDir = path.join(__dirname, '../fixtures');
  await fs.rm(fixturesDir, { recursive: true, force: true });
}

export default globalTeardown;
