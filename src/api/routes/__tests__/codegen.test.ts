import { Request, Response } from 'express';
import { generateCode } from '../codegen';
import { buildApiHandler, SingleCompletionHandler, BaseProvider } from '../../providers/index';
import { PlannerAgent } from '../../../services/planner/PlannerAgent';
import { ProjectService } from '../../../services/project/ProjectService';
import request from 'supertest';
import express from 'express';
import type { ApiHandlerOptions } from '../../../shared/api';

// Create Express app for integration tests
const app = express();
app.use(express.json());
app.post('/api/generate', generateCode);

// Mock providers module
jest.mock('../../providers', () => ({
    buildApiHandler: jest.fn(() => ({
        createMessage: jest.fn(),
        getModel: jest.fn()
    }))
}));

// Mock dependencies
jest.mock('../../providers');
jest.mock('../../../services/planner/PlannerAgent');
jest.mock('../../../services/project/ProjectService');

describe('Codegen Router', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: jest.Mock;

    beforeEach(() => {
        mockNext = jest.fn();
        mockResponse = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            setHeader: jest.fn(),
            write: jest.fn(),
            end: jest.fn(),
        };
    });

    describe('POST /generate', () => {
        const mockStreamResponse = async function* () {
            yield { type: 'text', text: 'Generated code' };
        };

        const mockPlan = {
            steps: [
                {
                    id: 'step-1',
                    description: 'Initialize codebase',
                    tasks: ['Create structure'],
                    files: ['src/index.ts']
                }
            ],
            metadata: {
                estimatedTime: '30m',
                complexity: 'low'
            }
        };

        beforeEach(() => {
            (buildApiHandler as jest.Mock).mockImplementation(() => ({
                createMessage: jest.fn().mockReturnValue(mockStreamResponse()),
                getModel: jest.fn().mockReturnValue({ id: 'test-model', info: {} })
            }));

            (PlannerAgent as jest.Mock).mockImplementation(() => ({
                createPlan: jest.fn().mockResolvedValue(mockPlan),
                streamPlanExecution: jest.fn().mockReturnValue(mockStreamResponse())
            }));
        });

        it('should return 400 if prompt is missing', async () => {
            mockRequest = {
                body: {}
            };

            await generateCode(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Prompt is required'
            });
        });

        it('should stream direct code generation without planning', async () => {
            mockRequest = {
                body: {
                    prompt: 'Create a function',
                    planFirst: false
                }
            };

            await generateCode(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
            expect(mockResponse.write).toHaveBeenCalled();
            expect(mockResponse.end).toHaveBeenCalled();
        });

        it('should stream planned code generation when planFirst is true', async () => {
            mockRequest = {
                body: {
                    prompt: 'Create a function',
                    planFirst: true
                }
            };

            await generateCode(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.write).toHaveBeenCalledWith(
                expect.stringContaining('plan')
            );
            expect(mockResponse.write).toHaveBeenCalledWith(
                expect.stringContaining('Generated code')
            );
            expect(mockResponse.end).toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            mockRequest = {
                body: {
                    prompt: 'Create a function',
                }
            };

            const error = new Error('Provider error');
            (buildApiHandler as jest.Mock).mockImplementation(() => {
                throw error;
            });

            await generateCode(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.write).toHaveBeenCalledWith(
                expect.stringContaining('Provider error')
            );
            expect(mockResponse.end).toHaveBeenCalled();
        });
    });
});

describe('Codegen Integration Tests', () => {
    beforeAll(() => {
        // Ensure we're using test environment
        process.env.NODE_ENV = 'test';
    });

    describe('POST /api/generate', () => {
        it('should generate code using real AI service', async () => {
            const response = await request(app)
                .post('/api/generate')
                .send({
                    prompt: 'Write a simple function that adds two numbers',
                    planFirst: false
                });

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toMatch(/text\/event-stream/);
            
            // The response should be a stream, so we'll need to parse the chunks
            const chunks = response.text.split('\n\n')
                .filter(chunk => chunk.startsWith('data: '))
                .map(chunk => JSON.parse(chunk.replace('data: ', '')));

            // Verify we got some generated code
            expect(chunks.some(chunk => 
                chunk.type === 'text' && 
                typeof chunk.text === 'string' && 
                chunk.text.includes('function')
            )).toBe(true);
        }, 30000); // Increase timeout for real API calls

        it('should plan, generate code, and commit changes when projectId is provided', async () => {
            // Mock ProjectService implementation
            const mockCommit = jest.fn().mockResolvedValue('commit-hash');
            const mockInitialize = jest.fn().mockResolvedValue(undefined);
            (ProjectService as jest.Mock).mockImplementation(() => ({
                initialize: mockInitialize,
                commit: mockCommit
            }));

            const response = await request(app)
                .post('/api/generate')
                .send({
                    prompt: 'Create a simple calculator class with add and subtract methods',
                    planFirst: true,
                    projectId: 'test-project'
                });

            expect(response.status).toBe(200);
            
            const chunks = response.text.split('\n\n')
                .filter(chunk => chunk.startsWith('data: '))
                .map(chunk => JSON.parse(chunk.replace('data: ', '')));

            // Verify we got both a plan and generated code
            expect(chunks.some(chunk => chunk.type === 'plan')).toBe(true);
            expect(chunks.some(chunk => 
                chunk.type === 'text' && 
                typeof chunk.text === 'string' && 
                chunk.text.includes('class')
            )).toBe(true);

            // Verify project initialization and commits
            expect(mockInitialize).toHaveBeenCalled();
            expect(mockCommit).toHaveBeenCalledWith(
                expect.stringContaining('Files modified')
            );
        }, 30000);

        it('should handle invalid requests', async () => {
            const response = await request(app)
                .post('/api/generate')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                status: 'error',
                message: 'Prompt is required'
            });
        });
    });

    describe('Project Integration', () => {
        it('should handle project service errors gracefully', async () => {
            (ProjectService as jest.Mock).mockImplementation(() => ({
                initialize: jest.fn().mockRejectedValue(new Error('Project initialization failed')),
                commit: jest.fn()
            }));

            const response = await request(app)
                .post('/api/generate')
                .send({
                    prompt: 'Create a function',
                    planFirst: true,
                    projectId: 'test-project'
                });

            const chunks = response.text.split('\n\n')
                .filter(chunk => chunk.startsWith('data: '))
                .map(chunk => JSON.parse(chunk.replace('data: ', '')));

            expect(chunks.some(chunk =>
                chunk.type === 'error' &&
                chunk.message.includes('Project initialization failed')
            )).toBe(true);
        });

        it('should handle commit errors gracefully', async () => {
            (ProjectService as jest.Mock).mockImplementation(() => ({
                initialize: jest.fn().mockResolvedValue(undefined),
                commit: jest.fn().mockRejectedValue(new Error('Commit failed'))
            }));

            const response = await request(app)
                .post('/api/generate')
                .send({
                    prompt: 'Create a function',
                    planFirst: true,
                    projectId: 'test-project'
                });

            const chunks = response.text.split('\n\n')
                .filter(chunk => chunk.startsWith('data: '))
                .map(chunk => JSON.parse(chunk.replace('data: ', '')));

            expect(chunks.some(chunk =>
                chunk.type === 'error' &&
                chunk.message.includes('Commit failed')
            )).toBe(true);
        });
    });
});