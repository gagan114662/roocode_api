import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { ProjectService } from './project.service';
const modes = require('../config/roocodeModes');

export class DependencyUpdateService {
    constructor(
        private projectService: ProjectService,
        private workspacePath: string = process.env.WORKSPACE_PATH || '/workspaces'
    ) {}

    async updateDependencies(projectId: string): Promise<{
        updated: boolean;
        changes?: Record<string, { from: string; to: string }>;
        error?: string;
    }> {
        try {
            const projectPath = join(this.workspacePath, projectId);
            
            // Read package.json from project
            const packageJson = await this.projectService.readFile(projectId, 'package.json');

            if (!packageJson) {
                throw new Error('package.json not found');
            }

            // Parse package.json
            const dependencies = JSON.parse(packageJson);
            const changes: Record<string, { from: string; to: string }> = {};

            // Example update logic (replace with actual LLM call)
            if (dependencies.dependencies) {
                Object.entries(dependencies.dependencies).forEach(([pkg, version]) => {
                    if (typeof version === 'string' && version.startsWith('^')) {
                        changes[pkg] = {
                            from: version,
                            to: version.replace('^', '')
                        };
                    }
                });
            }

            if (Object.keys(changes).length === 0) {
                return { updated: false };
            }

            // Update package.json with new versions
            const updatedDependencies = {
                ...dependencies,
                dependencies: {
                    ...dependencies.dependencies,
                    ...Object.fromEntries(
                        Object.entries(changes).map(([pkg, { to }]) => [pkg, to])
                    )
                }
            };

            // Write updated package.json
            await this.projectService.writeFile(
                projectId,
                'package.json',
                JSON.stringify(updatedDependencies, null, 2)
            );

            // Commit changes
            await this.projectService.commit(projectId, 'chore: update dependencies');

            return {
                updated: true,
                changes
            };

        } catch (error) {
            console.error('Dependency update failed:', error);
            return {
                updated: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}

// Export service factory with default workspace path
export const createDependencyUpdateService = (projectService: ProjectService, workspacePath?: string) => {
    return new DependencyUpdateService(projectService, workspacePath);
};