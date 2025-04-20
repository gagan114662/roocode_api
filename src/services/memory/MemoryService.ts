// src/services/memory/MemoryService.ts
import fs from 'fs/promises';
import path from 'path';
import { MemorySection, memorySections } from '../../config/memorySections';

export class MemoryService {
  private baseDir(projectId: string) {
    return path.join(process.cwd(), 'workspaces', projectId, 'memory');
  }

  async ensureMemoryDir(projectId: string) {
    const dir = this.baseDir(projectId);
    await fs.mkdir(dir, { recursive: true });
  }

  async readSection(projectId: string, section: MemorySection): Promise<string> {
    if (!memorySections.includes(section)) {
      throw new Error(`Unknown memory section: ${section}`);
    }
    const file = path.join(this.baseDir(projectId), `${section}.md`);
    try {
      return await fs.readFile(file, 'utf-8');
    } catch (err: any) {
      if (err.code === 'ENOENT') return '';
      throw err;
    }
  }

  async appendToSection(
    projectId: string,
    section: MemorySection,
    entry: string
  ): Promise<void> {
    await this.ensureMemoryDir(projectId);
    const file = path.join(this.baseDir(projectId), `${section}.md`);
    const timestamp = new Date().toISOString();
    const line = `- [${timestamp}] ${entry.replace(/\r?\n/g, ' ')}\n`;
    await fs.appendFile(file, line);
  }

  async listSections(projectId: string): Promise<MemorySection[]> {
    const dir = this.baseDir(projectId);
    try {
      const files = await fs.readdir(dir);
      return files
        .filter(f => f.endsWith('.md'))
        .map(f => f.replace(/\.md$/, '') as MemorySection)
        .filter(s => memorySections.includes(s));
    } catch (err: any) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  }
}

export default MemoryService;
