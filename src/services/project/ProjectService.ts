import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import simpleGit, { SimpleGit } from 'simple-git';
import { fileExistsAtPath } from '../../utils/fs';

export interface ProjectConfig {
    id: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

export class ProjectService {
    private git!: SimpleGit;
    private projectPath: string;

    constructor(projectId: string, workspacesRoot?: string) {
        // Use .roocode directory in user's home by default
        const defaultRoot = path.join(os.homedir(), '.roocode', 'workspaces');
        this.projectPath = path.join(workspacesRoot || defaultRoot, projectId);
    }

    async initialize(): Promise<void> {
        try {
            // Create project directory if it doesn't exist
            await fs.mkdir(this.projectPath, { recursive: true, mode: 0o755 });
            
            // Initialize git instance after directory exists
            this.git = simpleGit(this.projectPath);

            // Check if git repo exists, if not initialize it
            const gitDir = path.join(this.projectPath, '.git');
            const hasGit = await fileExistsAtPath(gitDir);

            if (!hasGit) {
                await this.git.init();
                await this.git.addConfig('user.name', 'Roo Code');
                await this.git.addConfig('user.email', 'noreply@example.com');
                
                // Create initial commit
                await this.git.add('.');
                try {
                    await this.git.commit('Initial commit');
                } catch (error) {
                    // Ignore error if there's nothing to commit
                }
            }
        } catch (error) {
            console.error('Error initializing project:', error);
            throw error;
        }
    }

    async commit(message: string): Promise<string> {
        try {
            await this.git.add('.');
            const result = await this.git.commit(message);
            return result.commit || '';
        } catch (error) {
            console.error('Error committing changes:', error);
            throw error;
        }
    }

    async diff(fromCommit?: string, toCommit?: string): Promise<string> {
        try {
            if (!fromCommit && !toCommit) {
                // Get working directory changes
                const diffResult = await this.git.diff();
                return diffResult || '';
            } else if (!toCommit) {
                // Diff between commit and working directory
                const options = fromCommit ? [fromCommit] : [];
                const diffResult = await this.git.diff(options);
                return diffResult || '';
            } else {
                // Diff between two commits
                const diffResult = await this.git.diff([fromCommit, toCommit].filter((c): c is string => !!c));
                return diffResult || '';
            }
        } catch (error) {
            console.error('Git diff error:', error);
            return '';
        }
    }

    async revert(commitHash: string): Promise<void> {
        try {
            await this.git.reset(['--hard', commitHash]);
            // Clean untracked files
            await this.git.clean('f', ['-d']);
        } catch (error) {
            console.error('Error reverting changes:', error);
            throw error;
        }
    }

    async getProjectPath(): Promise<string> {
        return this.projectPath;
    }

    async saveConfig(config: ProjectConfig): Promise<void> {
        try {
            const configPath = path.join(this.projectPath, '.roocode.json');
            await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        } catch (error) {
            console.error('Error saving config:', error);
            throw error;
        }
    }

    async loadConfig(): Promise<ProjectConfig | null> {
        try {
            const configPath = path.join(this.projectPath, '.roocode.json');
            const configData = await fs.readFile(configPath, 'utf-8');
            return JSON.parse(configData);
        } catch (error) {
            return null;
        }
    }
}