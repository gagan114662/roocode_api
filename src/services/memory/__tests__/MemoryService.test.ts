import fs from 'fs/promises';
import path from 'path';
import { MemoryService } from '../MemoryService';
import { memorySections } from '../../../config/memorySections';

const projectId = 'test-project';
const workspaceDir = path.join(process.cwd(), 'workspaces', projectId);
const memoryDir = path.join(workspaceDir, 'memory');
const svc = new MemoryService();

beforeEach(async () => {
  // ensure a clean slate
  await fs.rm(workspaceDir, { recursive: true, force: true });
});

afterAll(async () => {
  await fs.rm(workspaceDir, { recursive: true, force: true });
});

describe('MemoryService', () => {
  it('readSection returns empty string for missing section', async () => {
    const content = await svc.readSection(projectId, 'productContext');
    expect(content).toBe('');
  });

  it('appendToSection creates dir and file, with timestamped entry', async () => {
    await svc.appendToSection(projectId, 'decisionLog', 'Made a choice');
    const file = path.join(memoryDir, 'decisionLog.md');
    const txt = await fs.readFile(file, 'utf-8');
    expect(txt).toMatch(/^\- \[\d{4}-\d{2}-\d{2}T.*\] Made a choice/);
  });

  it('readSection returns full contents after append', async () => {
    await svc.appendToSection(projectId, 'implementationNotes', 'Noted something');
    const content = await svc.readSection(projectId, 'implementationNotes');
    expect(content).toContain('Noted something');
  });

  it('listSections returns only existing .md sections', async () => {
    await svc.appendToSection(projectId, 'testCoverage', 'Coverage data');
    await svc.appendToSection(projectId, 'ciIssues', 'CI fail data');
    const sections = await svc.listSections(projectId);
    expect(sections.sort()).toEqual(['ciIssues','testCoverage'].sort());
  });

  it('listSections returns empty array if no memory dir', async () => {
    const sections = await svc.listSections(projectId);
    expect(sections).toEqual([]);
  });

  it('readSection throws on invalid section name', async () => {
    // @ts-expect-error: testing invalid input
    await expect(svc.readSection(projectId, 'noSuchSection')).rejects.toThrow('Unknown memory section');
  });

  it('handles multi-line entries by converting to single line', async () => {
    const multilineEntry = `First line
    Second line
    Third line`;
    await svc.appendToSection(projectId, 'implementationNotes', multilineEntry);
    const content = await svc.readSection(projectId, 'implementationNotes');
    expect(content).toMatch(/First line Second line Third line/);
    expect(content).not.toContain('\n    Second');
  });
});
