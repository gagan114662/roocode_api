import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class ProjectService {
    private getProjectPath(projectId: string): string {
        // In a real implementation, this would look up the project's workspace path
        // For now, we'll just use the current workspace
        return process.cwd();
    }

    async readFile(projectId: string, filePath: string): Promise<string> {
        const fullPath = path.join(this.getProjectPath(projectId), filePath);
        return fs.readFile(fullPath, 'utf-8');
    }

    async writeFile(projectId: string, filePath: string, content: string): Promise<string> {
        const fullPath = path.join(this.getProjectPath(projectId), filePath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content, 'utf-8');
        return fullPath;
    }

    async applyPatch(projectId: string, patch: string): Promise<void> {
        const projectPath = this.getProjectPath(projectId);
        
        // Write patch to temporary file
        const patchFile = path.join(projectPath, '.tmp-patch');
        await fs.writeFile(patchFile, patch, 'utf-8');

        try {
            // Apply patch
            await execAsync(`git apply ${patchFile}`, { cwd: projectPath });
        } finally {
            // Clean up temp file
            await fs.unlink(patchFile).catch(() => {});
        }
    }

    async commit(projectId: string, message: string): Promise<void> {
        const projectPath = this.getProjectPath(projectId);
        await execAsync('git add .', { cwd: projectPath });
        await execAsync(`git commit -m "${message}"`, { cwd: projectPath });
    }
}

export const projectService = new ProjectService();