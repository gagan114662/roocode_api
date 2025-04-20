import { PlannerAgent, Plan, PlanStep } from './planner';
import { SingleCompletionHandler } from '.';
import { ApiStream } from './transform/stream';

describe('PlannerAgent', () => {
    let mockProvider: jest.Mocked<SingleCompletionHandler>;

    beforeEach(() => {
        mockProvider = {
            createMessage: jest.fn(),
            getModel: jest.fn(),
        };
    });

    describe('createPlan', () => {
        it('should create a plan from prompt', async () => {
            const planText = `1. Initialize the project
Tasks:
- Create package.json
- Set up TypeScript configuration
Files:
- package.json
- tsconfig.json

2. Set up the database
Tasks:
- Configure database connection
- Create schema
Files:
- src/db/config.ts
- src/db/schema.ts

3. Implement user authentication
Tasks:
- Create user model
- Implement login/signup
Files:
- src/models/user.ts
- src/auth/index.ts`;

            mockProvider.createMessage.mockImplementation(async function* () {
                yield { type: 'text', text: planText };
            });

            const planner = new PlannerAgent(mockProvider);
            const plan = await planner.createPlan('Create a web app');

            expect(plan.steps).toHaveLength(3);
            expect(plan.steps[0]).toEqual({
                id: 'step-1',
                description: 'Initialize the project',
                status: 'pending' as const,
                tasks: [
                    'Create package.json',
                    'Set up TypeScript configuration'
                ],
                files: [
                    'package.json',
                    'tsconfig.json'
                ]
            });
            expect(plan.context).toBe('Create a web app');
        });

        it('should handle empty response', async () => {
            mockProvider.createMessage.mockImplementation(async function* () {
                yield { type: 'text', text: '' };
            });

            const planner = new PlannerAgent(mockProvider);
            const plan = await planner.createPlan('Create a web app');

            expect(plan.steps).toHaveLength(0);
            expect(plan.context).toBe('Create a web app');
        });
    });

    describe('streamPlanExecution', () => {
        it('should execute plan steps and update status', async () => {
            const plan: Plan = {
                steps: [
                    {
                        id: 'step-1',
                        description: 'Initialize project',
                        status: 'pending' as const,
                        tasks: ['Create project structure'],
                        files: ['package.json']
                    }
                ],
                context: 'Create a web app'
            };

            mockProvider.createMessage.mockImplementation(async function* () {
                yield { type: 'text', text: 'Generated code' };
            });

            const planner = new PlannerAgent(mockProvider);
            const chunks: any[] = [];

            for await (const chunk of planner.streamPlanExecution(plan)) {
                chunks.push(chunk);
            }

            // Should emit step-update at start and end, plus the code chunk
            expect(chunks).toHaveLength(3);
            expect(chunks[0]).toEqual({
                type: 'step-update',
                step: expect.objectContaining({ status: 'in-progress' })
            });
            expect(chunks[1]).toEqual({
                type: 'text',
                text: 'Generated code'
            });
            expect(chunks[2]).toEqual({
                type: 'step-update',
                step: expect.objectContaining({ status: 'completed' })
            });
        });

        it('should handle errors during execution', async () => {
            const plan: Plan = {
                steps: [
                    {
                        id: 'step-1',
                        description: 'Initialize project',
                        status: 'pending' as const,
                        tasks: ['Create project structure'],
                        files: ['package.json']
                    }
                ],
                context: 'Create a web app'
            };

            mockProvider.createMessage.mockImplementation(async function* () {
                throw new Error('Generation failed');
            });

            const planner = new PlannerAgent(mockProvider);
            const chunks: any[] = [];

            for await (const chunk of planner.streamPlanExecution(plan)) {
                chunks.push(chunk);
            }

            expect(chunks).toHaveLength(3);
            expect(chunks[0]).toEqual({
                type: 'step-update',
                step: expect.objectContaining({ status: 'in-progress' })
            });
            expect(chunks[1]).toEqual({
                type: 'error',
                step: expect.objectContaining({ id: 'step-1' }),
                error: expect.any(Error)
            });
            expect(chunks[2]).toEqual({
                type: 'step-update',
                step: expect.objectContaining({ status: 'failed' })
            });
        });
    });
});