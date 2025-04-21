import { exec } from 'child_process';
import { validateWithRetry } from '../../utils/validator';
import { ProjectService } from '../project/ProjectService';
import { MemoryService } from '../memory/MemoryService';
import { VectorContextService } from '../context/VectorContextService';

export interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export class FunctionHandler {
  constructor(
    private projectService: ProjectService,
    private memoryService: MemoryService,
    private vectorService: VectorContextService
  ) {}

  async execute<T>(command: string): Promise<CommandResult<T>> {
    try {
      const result = await validateWithRetry<T>('function', async () => {
        return new Promise((resolve, reject) => {
          exec(command, (error, stdout) => {
            if (error) reject(error);
            try {
              resolve(JSON.parse(stdout));
            } catch (e) {
              reject(new Error('Invalid JSON output'));
            }
          });
        });
      });
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async runTests(params: { projectId: string; testPattern?: string }) {
    try {
      const result = await this.execute(`npm test ${params.testPattern || ''}`);
      await this.memoryService.appendToSection(
        params.projectId,
        'testCoverage',
        `Tests ${result.success ? 'succeeded' : 'failed'}`
      );
      return result;
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}
