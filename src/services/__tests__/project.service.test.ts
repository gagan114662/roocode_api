import { ProjectService } from '../project.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

jest.mock('fs/promises');
jest.mock('child_process');

const execAsync = promisify(exec);

describe('ProjectService', () => {
    let projectService: ProjectService;
    const testWorkspaceDir = '/test/workspaces';
    const testProjectId = 'test-project';
    const projectPath = path.join(testWorkspaceDir, testProjectId);

    beforeEach(() => {
        projectService = new ProjectService(testWorkspaceDir);
        jest.clearAllMocks();
    });

    describe('initializeProject', () => {
        it('should create project directory and initialize git repo', async () => {
            const mockExec = exec as jest.MockedFunction<typeof exec>;
            mockExec.mockImplementation((command: string, options: any, callback: any) => {
                callback(null, { stdout: '', stderr: '' });
                return {} as any;
            });

            await projectService.initializeProject(testProjectId);

            expect(fs.mkdir).toHaveBeenCalledWith(projectPath, { recursive: true });
            expect(exec).toHaveBeenCalledWith('git init', { cwd: projectPath }, expect.any(Function));
            expect(fs.writeFile).toHaveBeenCalledWith(
                path.join(projectPath, '.gitignore'),
                expect.any(String)
            );
        });
    });

    describe('commit', () => {
        it('should add and commit changes', async () => {
            const description = 'test commit';
            const mockExec = exec as jest.MockedFunction<typeof exec>;
            mockExec.mockImplementation((command: string, options: any, callback: any) => {
                callback(null, { stdout: '', stderr: '' });
                return {} as any;
            });

            await projectService.commit(testProjectId, description);

            expect(exec).toHaveBeenCalledWith('git add .', { cwd: projectPath }, expect.any(Function));
            expect(exec).toHaveBeenCalledWith(
                'git commit -m "test commit"',
                { cwd: projectPath },
                expect.any(Function)
            );
        });
    });

    describe('diff', () => {
        it('should return diff from HEAD when no commit specified', async () => {
            const mockExec = exec as jest.MockedFunction<typeof exec>;
            mockExec.mockImplementation((command: string, options: any, callback: any) => {
                callback(null, { stdout: 'test diff', stderr: '' });
                return {} as any;
            });

            const diff = await projectService.diff(testProjectId);

            expect(exec).toHaveBeenCalledWith(
                'git diff HEAD',
                { cwd: projectPath },
                expect.any(Function)
            );
            expect(diff).toBe('test diff');
        });
    });

    describe('getProjectFiles', () => {
        it('should return list of tracked files', async () => {
            const mockExec = exec as jest.MockedFunction<typeof exec>;
            mockExec.mockImplementation((command: string, options: any, callback: any) => {
                callback(null, { stdout: 'file1.ts\nfile2.ts', stderr: '' });
                return {} as any;
            });

            const files = await projectService.getProjectFiles(testProjectId);

            expect(exec).toHaveBeenCalledWith(
                'git ls-files',
                { cwd: projectPath },
                expect.any(Function)
            );
            expect(files).toEqual(['file1.ts', 'file2.ts']);
        });
    });

    describe('file operations', () => {
        const testFilePath = 'test.ts';
        const testContent = 'test content';

        it('should write and read files', async () => {
            const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
            mockReadFile.mockResolvedValue(testContent);

            await projectService.writeFile(testProjectId, testFilePath, testContent);
            const content = await projectService.readFile(testProjectId, testFilePath);

            expect(fs.writeFile).toHaveBeenCalledWith(
                path.join(projectPath, testFilePath),
                testContent
            );
            expect(content).toBe(testContent);
        });
    });
});