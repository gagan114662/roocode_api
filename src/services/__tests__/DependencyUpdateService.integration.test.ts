import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { ProjectService } from '../project.service';
import { createDependencyUpdateService } from '../DependencyUpdateService';

describe('DependencyUpdateService Integration', () => {
    const testWorkspacePath = join(__dirname, '../../..', 'test-workspaces');
    const testProjectId = 'test-project';
    const testProjectPath = join(testWorkspacePath, testProjectId);
    
    const projectService = new ProjectService();
    const dependencyUpdateService = createDependencyUpdateService(projectService, testWorkspacePath);

    beforeAll(async () => {
        // Create test project structure
        mkdirSync(testProjectPath, { recursive: true });

        // Create initial package.json with some dependencies
        const packageJson = {
            name: 'test-project',
            version: '1.0.0',
            dependencies: {
                'express': '^4.17.1',
                'lodash': '^4.17.21',
                'typescript': '4.9.5' // Already pinned version
            }
        };

        writeFileSync(
            join(testProjectPath, 'package.json'),
            JSON.stringify(packageJson, null, 2)
        );

        // Initialize git repo for the test project
        await projectService.initializeProject(testProjectId);
    });

    afterAll(() => {
        // Clean up test project
        rmSync(testWorkspacePath, { recursive: true, force: true });
    });

    it('should update dependencies with semver ranges to fixed versions', async () => {
        const result = await dependencyUpdateService.updateDependencies(testProjectId);

        expect(result.updated).toBe(true);
        expect(result.changes).toBeDefined();
        expect(result.changes).toEqual({
            'express': {
                from: '^4.17.1',
                to: '4.17.1'
            },
            'lodash': {
                from: '^4.17.21',
                to: '4.17.21'
            }
        });

        // Read the actual file to verify changes
        const updatedPackageJson = await projectService.readFile(testProjectId, 'package.json');
        const updatedDeps = JSON.parse(updatedPackageJson).dependencies;

        // Verify fixed versions
        expect(updatedDeps.express).toBe('4.17.1');
        expect(updatedDeps.lodash).toBe('4.17.21');
        expect(updatedDeps.typescript).toBe('4.9.5'); // Should remain unchanged
    });
});