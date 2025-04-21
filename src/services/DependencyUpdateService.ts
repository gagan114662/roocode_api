import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import OpenAI from 'openai';
import { ProjectService } from './project.service';
const modes = require('../config/roocodeModes');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

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

            // Generate AI-assisted dependency updates
            const aiPrompt = modes.DependencyUpdate.promptTemplate.replace(
                '{{packageJson}}',
                JSON.stringify(dependencies, null, 2)
            );

            const completion = await openai.chat.completions.create({
                model: modes.DependencyUpdate.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a dependency maintenance expert. Analyze package.json and suggest appropriate semver-compatible updates.'
                    },
                    {
                        role: 'user',
                        content: aiPrompt
                    }
                ],
                temperature: 0.1
            });

            // Parse and validate LLM response
            const content = completion.choices[0].message.content;
            if (!content) {
                throw new Error('LLM returned empty response');
            }

            let suggestedUpdates;
            try {
                suggestedUpdates = JSON.parse(content);
            } catch (error) {
                console.error('Failed to parse LLM response:', content);
                throw new Error('Invalid JSON response from LLM');
            }

            if (!suggestedUpdates || typeof suggestedUpdates !== 'object') {
                throw new Error('Invalid updates format from LLM');
            }

            // Process suggested updates
            let hasUpdates = false;
            if (dependencies.dependencies && suggestedUpdates.dependencies) {
                Object.entries(suggestedUpdates.dependencies).forEach(([pkg, version]) => {
                    const currentVersion = dependencies.dependencies[pkg];
                    if (currentVersion && currentVersion !== version) {
                        changes[pkg] = {
                            from: currentVersion,
                            to: version as string
                        };
                        hasUpdates = true;
                    }
                });
            }

            if (!hasUpdates) {
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