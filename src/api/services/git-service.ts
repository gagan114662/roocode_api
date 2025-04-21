import { exec } from 'child_process';
import { promisify } from 'util';
import { withRetry, RetryOptions } from '../utils/retry';

const execAsync = promisify(exec);

export interface GitCommandResult {
  success: boolean;
  output?: string;
  error?: string;
}

export class GitService {
  private workingDir: string;
  private retryOptions: Partial<RetryOptions>;

  constructor(workingDir: string) {
    this.workingDir = workingDir;
    this.retryOptions = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 5000
    };
  }

  public async executeCommand(command: string, args: string[] = []): Promise<GitCommandResult> {
    const gitCommand = `git ${command} ${args.join(' ')}`;
    
    try {
      const { stdout, stderr } = await withRetry(
        () => execAsync(gitCommand, { cwd: this.workingDir }),
        this.retryOptions
      );

      if (stderr && !this.isWarning(stderr)) {
        return {
          success: false,
          error: stderr,
          output: stdout
        };
      }

      return {
        success: true,
        output: stdout
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  public async init(): Promise<GitCommandResult> {
    return this.executeCommand('init');
  }

  public async stage(file: string): Promise<GitCommandResult> {
    return this.executeCommand('add', [file]);
  }

  public async commit(message: string): Promise<GitCommandResult> {
    return this.executeCommand('commit', ['-m', `"${message}"`]);
  }

  public async addConfig(key: string, value: string): Promise<GitCommandResult> {
    return this.executeCommand('config', [key, value]);
  }

  public async hasChanges(): Promise<boolean> {
    const result = await this.executeCommand('status', ['--porcelain']);
    return result.success && !!result.output?.trim();
  }

  public async getCurrentBranch(): Promise<string> {
    const result = await this.executeCommand('rev-parse', ['--abbrev-ref', 'HEAD']);
    return result.success ? (result.output?.trim() || 'main') : 'main';
  }

  public async createBranch(name: string): Promise<GitCommandResult> {
    return this.executeCommand('checkout', ['-b', name]);
  }

  public async switchBranch(name: string): Promise<GitCommandResult> {
    return this.executeCommand('checkout', [name]);
  }

  public async pull(): Promise<GitCommandResult> {
    return this.executeCommand('pull');
  }

  public async push(branch?: string): Promise<GitCommandResult> {
    const currentBranch = branch || await this.getCurrentBranch();
    return this.executeCommand('push', ['origin', currentBranch]);
  }

  public async reset(hard: boolean = false): Promise<GitCommandResult> {
    const args = hard ? ['--hard'] : [];
    return this.executeCommand('reset', args);
  }

  public async clean(): Promise<GitCommandResult> {
    return this.executeCommand('clean', ['-fd']);
  }

  private isWarning(stderr: string): boolean {
    const warnings = [
      'warning: LF will be replaced by CRLF',
      'warning: in the working copy of',
      'warning: The file will have its original line endings'
    ];
    return warnings.some(warning => stderr.includes(warning));
  }
}