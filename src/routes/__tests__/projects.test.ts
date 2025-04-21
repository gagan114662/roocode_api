import request from 'supertest';
import express from 'express';
import { ProjectService } from '../../services/project.service';
import { projectsRouter } from '../projects';
import '@types/jest';

jest.mock('../../services/project.service');

describe('Projects Routes', () => {
    let app: express.Application;
    const mockProjectService = ProjectService as jest.MockedClass<typeof ProjectService>;

    beforeEach(() => {
        jest.clearAllMocks();
        app = express();
        app.use(express.json());
        app.use('/projects', projectsRouter);
    });

    describe('POST /projects/:projectId/init', () => {
        it('should initialize a new project', async () => {
            const projectId = 'test-project';
            
            mockProjectService.prototype.initializeProject.mockResolvedValueOnce();

            const response = await request(app)
                .post(`/projects/${projectId}/init`)
                .set('x-api-key', 'test-key');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(mockProjectService.prototype.initializeProject).toHaveBeenCalledWith(projectId);
        });
    });

    describe('GET /projects/:projectId/files', () => {
        it('should return list of project files', async () => {
            const projectId = 'test-project';
            const mockFiles = ['file1.ts', 'file2.ts'];
            
            mockProjectService.prototype.getProjectFiles.mockResolvedValueOnce(mockFiles);

            const response = await request(app)
                .get(`/projects/${projectId}/files`)
                .set('x-api-key', 'test-key');

            expect(response.status).toBe(200);
            expect(response.body.data.files).toEqual(mockFiles);
        });
    });

    describe('PUT /projects/:projectId/files/:filePath', () => {
        it('should write file content', async () => {
            const projectId = 'test-project';
            const filePath = 'test.ts';
            const content = 'test content';
            
            mockProjectService.prototype.writeFile.mockResolvedValueOnce();

            const response = await request(app)
                .put(`/projects/${projectId}/files/${filePath}`)
                .set('x-api-key', 'test-key')
                .send({ content });

            expect(response.status).toBe(200);
            expect(mockProjectService.prototype.writeFile).toHaveBeenCalledWith(
                projectId,
                filePath,
                content
            );
        });

        it('should return 400 if content is missing', async () => {
            const projectId = 'test-project';
            const filePath = 'test.ts';

            const response = await request(app)
                .put(`/projects/${projectId}/files/${filePath}`)
                .set('x-api-key', 'test-key')
                .send({});

            expect(response.status).toBe(400);
        });
    });

    describe('POST /projects/:projectId/commit', () => {
        it('should commit changes', async () => {
            const projectId = 'test-project';
            const description = 'test commit';
            
            mockProjectService.prototype.commit.mockResolvedValueOnce();

            const response = await request(app)
                .post(`/projects/${projectId}/commit`)
                .set('x-api-key', 'test-key')
                .send({ description });

            expect(response.status).toBe(200);
            expect(mockProjectService.prototype.commit).toHaveBeenCalledWith(
                projectId,
                description
            );
        });
    });

    describe('GET /projects/:projectId/diff', () => {
        it('should return diff', async () => {
            const projectId = 'test-project';
            const mockDiff = 'test diff content';
            
            mockProjectService.prototype.diff.mockResolvedValueOnce(mockDiff);

            const response = await request(app)
                .get(`/projects/${projectId}/diff`)
                .set('x-api-key', 'test-key');

            expect(response.status).toBe(200);
            expect(response.body.data.diff).toBe(mockDiff);
        });
    });
});