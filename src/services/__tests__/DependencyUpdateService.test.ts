import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { DependencyUpdateService } from '../DependencyUpdateService';
import { ProjectService } from '../project.service';

// Mock ProjectService
jest.mock('../project.service', () => {
    return {
        ProjectService: jest.fn().mockImplementation(() => ({
            readFile: jest.fn(),
            writeFile: jest.fn(),
            commit: jest.fn(),
            initializeProject: jest.fn(),
            diff: jest.fn(),
            revert: jest.fn()
        }))
    };
});

describe('DependencyUpdateService', () => {
    let service: DependencyUpdateService;
    let mockProjectService: jest.Mocked<any>;

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        
        // Create a new instance for each test
        const ProjectServiceMock = jest.requireMock('../project.service').ProjectService;
        mockProjectService = new ProjectServiceMock();
        
        // @ts-ignore - Inject mock into service
        service = new DependencyUpdateService();
        service.projectService = mockProjectService;
    });

    it('should handle missing package.json', async () => {
        // Setup mock to return null (file not found)
        mockProjectService.readFile.mockResolvedValue(null);

        const result = await service.updateDependencies('test-project');

        expect(result).toEqual({
            updated: false,
            error: 'package.json not found'
        });
        expect(mockProjectService.readFile).toHaveBeenCalledWith('test-project', 'package.json');
    });

    it('should handle invalid package.json content', async () => {
        // Setup mock to return invalid JSON
        mockProjectService.readFile.mockResolvedValue('invalid json content');

        const result = await service.updateDependencies('test-project');

        expect(result).toEqual({
            updated: false,
            error: expect.any(String)
        });
    });

    it('should update dependencies when changes are needed', async () => {
        // Setup mock to return a package.json with dependencies
        const mockPackageJson = JSON.stringify({
            dependencies: {
                'express': '^4.17.1',
                'lodash': '^4.17.21'
            }
        });

        mockProjectService.readFile.mockResolvedValue(mockPackageJson);
        mockProjectService.writeFile.mockResolvedValue(undefined);
        mockProjectService.commit.mockResolvedValue(undefined);

        const result = await service.updateDependencies('test-project');

        expect(result).toEqual({
            updated: true,
            changes: {
                'express': {
                    from: '^4.17.1',
                    to: '4.17.1'
                },
                'lodash': {
                    from: '^4.17.21',
                    to: '4.17.21'
                }
            }
        });

        // Verify the file was written and changes were committed
        expect(mockProjectService.writeFile).toHaveBeenCalled();
        expect(mockProjectService.commit).toHaveBeenCalledWith('test-project', 'chore: update dependencies');
    });

    it('should return no changes when dependencies are already up to date', async () => {
        // Setup mock to return a package.json with already pinned versions
        const mockPackageJson = JSON.stringify({
            dependencies: {
                'express': '4.17.1',
                'lodash': '4.17.21'
            }
        });

        mockProjectService.readFile.mockResolvedValue(mockPackageJson);

        const result = await service.updateDependencies('test-project');

        expect(result).toEqual({
            updated: false
        });

        // Verify no writes or commits were made
        expect(mockProjectService.writeFile).not.toHaveBeenCalled();
        expect(mockProjectService.commit).not.toHaveBeenCalled();
    });
});