import * as fs from 'fs/promises';
import * as path from 'path';
import os from 'os';
import { ProjectService } from '../ProjectService';

describe('ProjectService', () => {
    const tmpDir = path.join(os.tmpdir(), 'ProjectService-test');
    const projectId = 'test-project';
    let projectService: ProjectService;

    beforeEach(async () => {
        await fs.mkdir(tmpDir, { recursive: true });
        projectService = new ProjectService(projectId, tmpDir);
        await projectService.initialize();
    });

    afterEach(async () => {
        await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('should initialize a new project with git repository', async () => {
        const projectPath = await projectService.getProjectPath();
        const gitDir = path.join(projectPath, '.git');
        const hasGit = await fs.stat(gitDir).then(() => true).catch(() => false);
        expect(hasGit).toBe(true);
    });

    it('should create commits and track changes', async () => {
        const projectPath = await projectService.getProjectPath();
        const testFile = path.join(projectPath, 'test.txt');
        
        // Create a file and commit it
        await fs.writeFile(testFile, 'Initial content');
        const commitHash1 = await projectService.commit('Add test file');
        expect(commitHash1).toBeTruthy();

        // Modify file and create another commit
        await fs.writeFile(testFile, 'Modified content');
        const commitHash2 = await projectService.commit('Update test file');
        expect(commitHash2).toBeTruthy();

        // Get diff between commits
        const diff = await projectService.diff(commitHash1, commitHash2);
        expect(diff).toContain('-Initial content');
        expect(diff).toContain('+Modified content');
    });

    it('should revert changes to previous commit', async () => {
        const projectPath = await projectService.getProjectPath();
        const testFile = path.join(projectPath, 'test.txt');
        
        // Create initial commit
        await fs.writeFile(testFile, 'Initial content');
        const commitHash = await projectService.commit('Add test file');

        // Modify file
        await fs.writeFile(testFile, 'Modified content');
        
        // Revert changes
        await projectService.revert(commitHash);
        
        // Verify file contents
        const content = await fs.readFile(testFile, 'utf-8');
        expect(content).toBe('Initial content');
    });

    it('should save and load project configuration', async () => {
        const config = {
            id: projectId,
            description: 'Test project',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await projectService.saveConfig(config);
        const loadedConfig = await projectService.loadConfig();
        
        expect(loadedConfig).toMatchObject({
            id: config.id,
            description: config.description
        });
    });
});