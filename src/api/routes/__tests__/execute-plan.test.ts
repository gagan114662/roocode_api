import request from 'supertest';
import express from 'express';
import { executePlanRouter } from '../execute-plan';
import { openai } from '../../providers/openaiProvider';
import { projectService } from '../../services/projectService';
import { modes } from '../../core/modes';

jest.mock('../../providers/openaiProvider');
jest.mock('../../services/projectService');
jest.mock('../../core/modes');

const mockPlan = {
    tasks: [
        {
            id: 'task1',
            title: 'Test Task 1',
            description: 'Test Description 1',
            ownerMode: 'architect'
        },
        {
            id: 'task2',
            title: 'Test Task 2',
            description: 'Test Description 2',
            ownerMode: 'code'
        }
    ],
    metadata: {
        createdAt: '2025-04-19T00:00:00Z',
        status: 'pending'
    }
};

describe('Execute Plan Router', () => {
    let app: express.Application;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/projects', executePlanRouter);

        // Reset mocks
        jest.clearAllMocks();

        // Default mock implementations
        (projectService.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockPlan));
        (projectService.writeFile as jest.Mock).mockResolvedValue('');
        (projectService.commit as jest.Mock).mockResolvedValue(undefined);
        (modes.switch as jest.Mock).mockResolvedValue(undefined);
    });

    describe('POST /:id/execute-plan', () => {
        it('should execute all tasks in plan', async () => {
            const mockCompletion = {
                choices: [{
                    message: {
                        content: 'Task output'
                    }
                }]
            };

            (openai.chat.completions.create as jest.Mock).mockResolvedValue(mockCompletion);

            const response = await request(app)
                .post('/projects/123/execute-plan')
                .send({});

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.data.tasksToExecute).toBe(2);
            expect(response.body.data.progressEndpoint).toBe('/projects/123/plan/progress');
        });

        it('should execute specific tasks when taskIds provided', async () => {
            const mockCompletion = {
                choices: [{
                    message: {
                        content: 'Task output'
                    }
                }]
            };

            (openai.chat.completions.create as jest.Mock).mockResolvedValue(mockCompletion);

            const response = await request(app)
                .post('/projects/123/execute-plan')
                .send({ taskIds: ['task1'] });

            expect(response.status).toBe(200);
            expect(response.body.data.tasksToExecute).toBe(1);
        });

        it('should handle invalid task IDs', async () => {
            const response = await request(app)
                .post('/projects/123/execute-plan')
                .send({ taskIds: ['invalid-task'] });

            expect(response.status).toBe(400);
            expect(response.body.status).toBe('error');
        });

        it('should handle invalid plan.json', async () => {
            (projectService.readFile as jest.Mock).mockResolvedValue('invalid json');

            const response = await request(app)
                .post('/projects/123/execute-plan')
                .send({});

            expect(response.status).toBe(500);
        });
    });

    describe('GET /:id/plan/progress', () => {
        it('should set up SSE connection', async () => {
            const response = await request(app)
                .get('/projects/123/plan/progress')
                .send();

            expect(response.header['content-type']).toBe('text/event-stream');
            expect(response.header['cache-control']).toBe('no-cache');
            expect(response.header['connection']).toBe('keep-alive');
        });
    });
});