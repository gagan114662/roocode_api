import fs from 'fs/promises';
import path from 'path';
import { GitService } from './git-service';

export interface WorkspaceConfig {
  gitUser: {
    name: string;
    email: string;
  };
  readmeTemplate: string;
}

export class WorkspaceService {
  private static instance: WorkspaceService;
  private config: WorkspaceConfig;

  private constructor() {
    this.config = {
      gitUser: {
        name: 'Roo Code',
        email: 'roocode@example.com'
      },
      readmeTemplate: `# {{projectName}}

This project is managed by Roo Code.

## Project Structure

- \`/docs\`: Documentation and architecture diagrams
- \`/src\`: Source code
- \`/tests\`: Test files

## Getting Started

1. Install dependencies
2. Configure environment variables
3. Start the development server`
    };
  }

  public static getInstance(): WorkspaceService {
    if (!WorkspaceService.instance) {
      WorkspaceService.instance = new WorkspaceService();
    }
    return WorkspaceService.instance;
  }

  public getWorkspacePath(projectId: string): string {
    return path.join(process.cwd(), 'workspaces', projectId);
  }

  public async initializeWorkspace(projectId: string): Promise<void> {
    const workspacePath = this.getWorkspacePath(projectId);
    
    try {
      // Create workspace directory and subdirectories
      await fs.mkdir(workspacePath, { recursive: true });
      await fs.mkdir(path.join(workspacePath, 'src'), { recursive: true });
      await fs.mkdir(path.join(workspacePath, 'docs'), { recursive: true });
      await fs.mkdir(path.join(workspacePath, 'tests'), { recursive: true });

      // Initialize git repository
      const git = new GitService(workspacePath);
      await git.executeCommand('init');
      await git.executeCommand('config', ['user.name', this.config.gitUser.name]);
      await git.executeCommand('config', ['user.email', this.config.gitUser.email]);

      // Create and commit initial files
      await this.createInitialFiles(projectId, workspacePath);
      
      // Initial commit
      await git.executeCommand('add', ['.']);
      await git.executeCommand('commit', ['-m', 'Initial workspace setup']);

    } catch (error) {
      throw new Error(`Failed to initialize workspace: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async createInitialFiles(projectId: string, workspacePath: string): Promise<void> {
    try {
      // Create README.md
      const readmeContent = this.config.readmeTemplate.replace('{{projectName}}', projectId);
      await fs.writeFile(path.join(workspacePath, 'README.md'), readmeContent);

      // Create .gitignore
      const gitignoreContent = `# Dependencies
node_modules/
.pnp/
.pnp.js

# Environment variables
.env
.env.local

# Build outputs
dist/
build/
out/

# Editor files
.vscode/
.idea/
*.swp
`;
      await fs.writeFile(path.join(workspacePath, '.gitignore'), gitignoreContent);

      // Create empty docs/architecture.md
      await fs.writeFile(
        path.join(workspacePath, 'docs', 'architecture.md'),
        '# Architecture Overview\n\nTo be documented...\n'
      );

    } catch (error) {
      throw new Error(`Failed to create initial files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async validateWorkspace(projectId: string): Promise<boolean> {
    const workspacePath = this.getWorkspacePath(projectId);
    try {
      const stats = await fs.stat(workspacePath);
      return stats.isDirectory();
    } catch (error) {
      return false;
    }
  }

  public async cleanWorkspace(projectId: string): Promise<void> {
    const workspacePath = this.getWorkspacePath(projectId);
    try {
      await fs.rm(workspacePath, { recursive: true, force: true });
    } catch (error) {
      console.error(`Failed to clean workspace: ${error}`);
      // Don't throw - this is cleanup
    }
  }
}

export const workspaceService = WorkspaceService.getInstance();