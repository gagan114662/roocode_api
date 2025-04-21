import { FullConfig } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

async function setupWorkspace() {
  const testProjectId = 'e2e-test-project';
  const workspaceDir = path.join(process.cwd(), 'workspaces', testProjectId);
  const uploadsDir = path.join(workspaceDir, 'uploads');

  await fs.mkdir(uploadsDir, { recursive: true });

  // Create test fixtures
  const fixturesDir = path.join(__dirname, '../fixtures');
  await fs.mkdir(fixturesDir, { recursive: true });
  await fs.writeFile(
    path.join(fixturesDir, 'test.jpg'),
    Buffer.from('fake image data')
  );

  return { testProjectId, workspaceDir };
}

async function globalSetup(config: FullConfig) {
  // Start API server if needed
  const workspace = await setupWorkspace();
  process.env.TEST_PROJECT_ID = workspace.testProjectId;
}

export default globalSetup;
