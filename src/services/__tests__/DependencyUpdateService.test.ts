import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../../api';
import { ProjectService } from '../project.service';
import { openai } from '../../api/providers/openaiProvider';
import { jobQueueService } from '../JobQueueService';

// Mock dependencies
jest.mock('../project.service');
jest.mock('../../api/providers/openaiProvider');
jest.mock('../JobQueueService');

describe('DependencyUpdateService', () => {
    const mockProjectId = 'test-project';
    const mockPackageJson = `{
        "dependencies": {
            "express": "^4.17.1",
            "typescript": "^4.5.0"
        }
    }`;
    const mockDiff = `--- a/package.json\n+++ b/package.json\n@@ -1,6 +1,6 @@\n{\n   "dependencies": {\n-    "express": "^4.17.1",\n-    "typescript": "^4.5.0"\n+    "express": "^4.18.2",\n+    "typescript": "^5.0.4"\n   }\n}`;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup ProjectService mocks
        (ProjectService.prototype.readFile as jest.Mock).mockResolvedValue(mockPackageJson);
        (ProjectService.prototype.applyPatch as jest.Mock).mockResolvedValue();
        (ProjectService.prototype.commit as jest.Mock).mockResolvedValue();

        // Setup OpenAI mock
        (openai.chat.completions.create as jest.Mock).mockResolvedValue({
            choices: [{ message: { content: mockDiff } }]
        });

        // Setup JobQueueService mock
        (jobQueueService.addJob as jest.Mock).mockResolvedValue('test-job-id');
        (jobQueueService.getJob as jest.Mock).mockResolvedValue({
            id: 'test-job-id',
            status: 'completed',
            result: { diff: mockDiff },
            progress: 100
        });
    });

    describe('POST /projects/:projectId/update-deps', () => {
        it('should queue dependency update job by default', async () => {
            const response = await request(app)
                .post(`/projects/${mockProjectId}/update-deps`)
                .expect(200);

            expect(response.body).toEqual({
                status: 'success',
                data: {
                    jobId: 'test-job-id',
                    message: 'Dependency update job queued successfully'
                }
            });

            expect(jobQueueService.addJob).toHaveBeenCalledWith(
                'update-dependencies',
                expect.objectContaining({
                    projectId: mockProjectId,
                    mode: 'DependencyUpdate'
                })
            );
        });

        it('should perform immediate update when requested', async () => {
            const response = await request(app)
                .post(`/projects/${mockProjectId}/update-deps?immediate=true`)
                .expect(200);

            expect(response.body).toEqual({
                status: 'success',
                data: { diff: mockDiff }
            });

            expect(ProjectService.prototype.readFile).toHaveBeenCalledWith(mockProjectId, 'package.json');
            expect(ProjectService.prototype.applyPatch).toHaveBeenCalledWith(mockProjectId, mockDiff);
            expect(ProjectService.prototype.commit).toHaveBeenCalledWith(mockProjectId, 'chore: update dependencies');
        });
    });

    describe('GET /projects/:projectId/update-deps/:jobId', () => {
        it('should get job status', async () => {
            const response = await request(app)
                .get(`/projects/${mockProjectId}/update-deps/test-job-id`)
                .expect(200);

            expect(response.body).toEqual({
                status: 'success',
                data: {
                    jobId: 'test-job-id',
                    status: 'completed',
                    result: { diff: mockDiff },
                    progress: 100
                }
            });
        });
    });
});
