import { exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { promisify } from 'util';

interface ExecError extends Error {
    message: string;
}

const execAsync = promisify(exec);

export class ProjectService {
    private workspacesDir: string;

    constructor(workspacesBaseDir: string = '/workspaces') {
        this.workspacesDir = workspacesBaseDir;
    }

    private getProjectPath(projectId: string): string {
        return path.join(this.workspacesDir, projectId);
    }

    async initializeProject(projectId: string): Promise<void> {
        const projectPath = this.getProjectPath(projectId);
        
        // Create project directory if it doesn't exist
        await fs.mkdir(projectPath, { recursive: true });

        try {
            // Initialize git repository
            await execAsync('git init', { cwd: projectPath });
            
            // Create initial .gitignore
            const gitignore = `node_modules/\n.DS_Store\n*.log`;
            await fs.writeFile(path.join(projectPath, '.gitignore'), gitignore);
            
            // Initial commit
            await execAsync('git add .gitignore', { cwd: projectPath });
            await execAsync('git commit -m "Initial commit"', { cwd: projectPath });
        } catch (error) {
            const err = error as ExecError;
            throw new Error(`Failed to initialize project: ${err.message}`);
        }
    }

    async commit(projectId: string, description: string): Promise<void> {
        const projectPath = this.getProjectPath(projectId);
        
        try {
            await execAsync('git add .', { cwd: projectPath });
            await execAsync(`git commit -m "${description}"`, { cwd: projectPath });
        } catch (error) {
            const err = error as ExecError;
            throw new Error(`Failed to commit changes: ${err.message}`);
        }
    }

    async diff(projectId: string, fromCommit?: string): Promise<string> {
        const projectPath = this.getProjectPath(projectId);
        
        try {
            const command = fromCommit 
                ? `git diff ${fromCommit} HEAD`
                : 'git diff HEAD';
            
            const { stdout } = await execAsync(command, { cwd: projectPath });
            return stdout;
        } catch (error) {
            const err = error as ExecError;
            throw new Error(`Failed to get diff: ${err.message}`);
        }
    }

    async revert(projectId: string, commitHash: string): Promise<void> {
        const projectPath = this.getProjectPath(projectId);
        
        try {
            await execAsync(`git revert ${commitHash} --no-edit`, { cwd: projectPath });
        } catch (error) {
            const err = error as ExecError;
            throw new Error(`Failed to revert commit: ${err.message}`);
        }
    }

    async getProjectFiles(projectId: string): Promise<string[]> {
        const projectPath = this.getProjectPath(projectId);
        
        try {
            const { stdout } = await execAsync('git ls-files', { cwd: projectPath });
            return stdout.split('\n').filter(Boolean);
        } catch (error) {
            const err = error as ExecError;
            throw new Error(`Failed to list project files: ${err.message}`);
        }
    }

    async readFile(projectId: string, filePath: string): Promise<string> {
        const fullPath = path.join(this.getProjectPath(projectId), filePath);
        
        try {
            return await fs.readFile(fullPath, 'utf8');
        } catch (error) {
            const err = error as ExecError;
            throw new Error(`Failed to read file: ${err.message}`);
        }
    }

    async writeFile(projectId: string, filePath: string, content: string): Promise<void> {
        const fullPath = path.join(this.getProjectPath(projectId), filePath);
        
        try {
            // Ensure directory exists
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.writeFile(fullPath, content);
        } catch (error) {
            const err = error as ExecError;
            throw new Error(`Failed to write file: ${err.message}`);
        }
    }

    async deleteFile(projectId: string, filePath: string): Promise<void> {
        const fullPath = path.join(this.getProjectPath(projectId), filePath);
        
        try {
            await fs.unlink(fullPath);
        } catch (error) {
            const err = error as ExecError;
            throw new Error(`Failed to delete file: ${err.message}`);
        }
    }
}