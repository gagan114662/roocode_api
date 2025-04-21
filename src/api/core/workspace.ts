import path from 'path';
import fs from 'fs/promises';
import { gitConfig } from '../services/git-config';
import { GitService } from '../services/git-service';

export interface WorkspaceStructure {
  directories: string[];
  files: {
    path: string;
    content: string;
  }[];
}

export class WorkspaceManager {
  private static instance: WorkspaceManager;
  private baseDir: string;

  private initialized: boolean = false;

  private constructor() {
    this.baseDir = process.env.WORKSPACE_DIR || path.join(process.cwd(), 'workspaces');
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Create base workspace directory if it doesn't exist
      await fs.mkdir(this.baseDir, { recursive: true });

      // Initialize git configuration
      const defaultGitConfig = {
        'init.defaultBranch': 'main',
        'user.name': 'RooCode Bot',
        'user.email': 'bot@roocode.dev'
      };

      // Create .gitconfig in the workspace directory
      const gitConfigPath = path.join(this.baseDir, '.gitconfig');
      const gitConfigContent = Object.entries(defaultGitConfig)
        .map(([key, value]) => `[${key.split('.')[0]}]\n\t${key.split('.')[1]} = ${value}`)
        .join('\n');

      await fs.writeFile(gitConfigPath, gitConfigContent);

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize workspace manager: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public static getInstance(): WorkspaceManager {
    if (!WorkspaceManager.instance) {
      WorkspaceManager.instance = new WorkspaceManager();
    }
    return WorkspaceManager.instance;
  }

  public async initializeWorkspace(projectId: string, structure: WorkspaceStructure): Promise<void> {
    const workspacePath = this.getWorkspacePath(projectId);
    
    try {
      // Create workspace root
      await fs.mkdir(workspacePath, { recursive: true });

      // Create required directories
      for (const dir of structure.directories) {
        await fs.mkdir(path.join(workspacePath, dir), { recursive: true });
      }

      // Create initial files
      for (const file of structure.files) {
        await fs.writeFile(path.join(workspacePath, file.path), file.content);
      }

      // Initialize git repository
      await this.initializeGit(workspacePath);

    } catch (error) {
      await this.cleanup(projectId);
      throw error;
    }
  }

  private async initializeGit(workspacePath: string): Promise<void> {
    const git = new GitService(workspacePath);
    
    await git.executeCommand('init');
    await git.executeCommand('config', ['user.name', gitConfig.user.name]);
    await git.executeCommand('config', ['user.email', gitConfig.user.email]);
    
    if (!gitConfig.commit.gpgSign) {
      await git.executeCommand('config', ['commit.gpgsign', 'false']);
    }
    
    // Create and commit initial structure
    await git.stage('.');
    await git.commit('Initialize project workspace');
  }

  public getWorkspacePath(projectId: string): string {
    return path.join(this.baseDir, projectId);
  }

  public async exists(projectId: string): Promise<boolean> {
    try {
      await fs.access(this.getWorkspacePath(projectId));
      return true;
    } catch {
      return false;
    }
  }

  public async cleanup(projectId: string): Promise<void> {
    const workspacePath = this.getWorkspacePath(projectId);
    try {
      await fs.rm(workspacePath, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to clean up workspace ${projectId}:`, error);
    }
  }

  public async validate(projectId: string): Promise<boolean> {
    const workspacePath = this.getWorkspacePath(projectId);
    try {
      // Check if workspace exists
      const exists = await this.exists(projectId);
      if (!exists) return false;

      // Check for .git directory
      const gitExists = await fs.access(path.join(workspacePath, '.git'))
        .then(() => true)
        .catch(() => false);
      if (!gitExists) return false;

      // Validate git repository
      const git = new GitService(workspacePath);
      const isRepo = await git.executeCommand('rev-parse', ['--is-inside-work-tree']);
      return isRepo.success;

    } catch {
      return false;
    }
  }

  public async listWorkspaces(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.baseDir);
      const workspaces: string[] = [];

      for (const entry of entries) {
        if (await this.validate(entry)) {
          workspaces.push(entry);
        }
      }

      return workspaces;
    } catch {
      return [];
    }
  }
}

export const workspaceManager = WorkspaceManager.getInstance();