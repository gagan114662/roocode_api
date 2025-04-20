import request from 'supertest';
import express from 'express';
import { planRouter } from '../plan';
import { openai } from '../../providers/openaiProvider';
import { projectService } from '../../services/projectService';

jest.mock('../../providers/openaiProvider');
jest.mock('../../services/projectService');

describe('Plan Router', () => {
    let app: express.Application;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/projects', planRouter);

        // Reset mocks
        jest.clearAllMocks();
    });

    describe('POST /:id/plan', () => {
        it('should create a plan successfully', async () => {
            const mockCompletion = {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            tasks: [{
                                id: 'task1',
                                title: 'Test Task',
                                description: 'Test Description',
                                ownerMode: 'code'
                            }]
                        })
                    }
                }]
            };

            (openai.chat.completions.create as jest.Mock).mockResolvedValue(mockCompletion);
            (projectService.writeFile as jest.Mock).mockResolvedValue('plan.json');
            (projectService.commit as jest.Mock).mockResolvedValue(undefined);

            const response = await request(app)
                .post('/projects/123/plan')
                .send({ description: 'Test feature' });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.data.plan).toBeDefined();
            expect(projectService.writeFile).toHaveBeenCalled();
            expect(projectService.commit).toHaveBeenCalled();
        });

        it('should handle invalid request data', async () => {
            const response = await request(app)
                .post('/projects/123/plan')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.status).toBe('error');
        });

        it('should handle invalid LLM response', async () => {
            const mockCompletion = {
                choices: [{
                    message: {
                        content: 'invalid json'
                    }
                }]
            };

            (openai.chat.completions.create as jest.Mock).mockResolvedValue(mockCompletion);

            const response = await request(app)
                .post('/projects/123/plan')
                .send({ description: 'Test feature' });

            expect(response.status).toBe(500);
        });
    });
});