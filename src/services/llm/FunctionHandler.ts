import { FunctionImplementer } from './functions';
import { ProjectService } from '../project/ProjectService';
import { MemoryService } from '../memory/MemoryService';
import { VectorContextService } from '../context/VectorContextService';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Implements built-in functions available to LLM agents.
 */
export class FunctionHandler implements FunctionImplementer {
  constructor(
    private projectService: ProjectService,
    private memoryService: MemoryService,
    private vectorService: VectorContextService
  ) {}

  async runTests(args: {
    projectId: string;
    testPattern?: string;
    updateSnapshots?: boolean;
  }): Promise<{ success: boolean; output: string }> {
    const { projectId, testPattern, updateSnapshots } = args;
    const workspaceDir = path.join(process.cwd(), 'workspaces', projectId);

    let command = 'npm test';
    if (testPattern) command += ` -- -t "${testPattern}"`;
    if (updateSnapshots) command += ' -- -u';

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: workspaceDir
      });

      const success = !stderr;
      const output = stdout + (stderr ? `\nErrors:\n${stderr}` : '');

      // Log test results to memory
      await this.memoryService.appendToSection(
        projectId,
        'testCoverage',
        `Test run ${success ? 'succeeded' : 'failed'}:\n${output}`
      );

      return { success, output };
    } catch (error) {
      const output = `Test execution failed: ${error.message}`;
      await this.memoryService.appendToSection(
        projectId,
        'ciIssues',
        output
      );
      return { success: false, output };
    }
  }

  async getFileContent(args: {
    projectId: string;
    filePath: string;
  }): Promise<{ content: string }> {
    const { projectId, filePath } = args;
    const fullPath = path.join(process.cwd(), 'workspaces', projectId, filePath);
    
    try {
      const content = await this.projectService.readFile(fullPath);
      return { content };
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  async writeFile(args: {
    projectId: string;
    filePath: string;
    content: string;
    createDirs?: boolean;
  }): Promise<{ success: boolean; path: string }> {
    const { projectId, filePath, content, createDirs = true } = args;
    const fullPath = path.join(process.cwd(), 'workspaces', projectId, filePath);

    try {
      await this.projectService.writeFile(fullPath, content, { createDirs });

      // Log file creation/update
      await this.memoryService.appendToSection(
        projectId,
        'implementationNotes',
        `Updated file: ${filePath}`
      );

      return { success: true, path: filePath };
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error.message}`);
    }
  }

  async commitChanges(args: {
    projectId: string;
    message: string;
    files: string[];
  }): Promise<{ success: boolean; commit: string }> {
    const { projectId, message, files } = args;

    try {
      const commitHash = await this.projectService.commit(projectId, files, message);

      // Log commit to memory
      await this.memoryService.appendToSection(
        projectId,
        'implementationNotes',
        `Committed changes: ${message} (${commitHash})`
      );

      return { success: true, commit: commitHash };
    } catch (error) {
      throw new Error(`Failed to commit changes: ${error.message}`);
    }
  }

  async searchCode(args: {
    projectId: string;
    query: string;
    topK?: number;
  }): Promise<{ results: Array<{ text: string; file: string; score: number }> }> {
    const { projectId, query, topK = 5 } = args;

    try {
      const results = await this.vectorService.search(projectId, query, topK);
      return { results };
    } catch (error) {
      throw new Error(`Code search failed: ${error.message}`);
    }
  }

  async readMemory(args: {
    projectId: string;
    section: string;
  }): Promise<{ content: string }> {
    const { projectId, section } = args;

    try {
      const content = await this.memoryService.readSection(projectId, section);
      return { content };
    } catch (error) {
      throw new Error(`Failed to read memory section ${section}: ${error.message}`);
    }
  }

  async writeMemory(args: {
    projectId: string;
    section: string;
    entry: string;
  }): Promise<{ success: boolean }> {
    const { projectId, section, entry } = args;

    try {
      await this.memoryService.appendToSection(projectId, section, entry);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to write to memory section ${section}: ${error.message}`);
    }
  }
}

export default FunctionHandler;
