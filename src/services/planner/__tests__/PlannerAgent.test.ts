import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PlannerAgent } from '../PlannerAgent';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai', () => {
    return {
        default: jest.fn(() => ({
            chat: {
                completions: {
                    create: jest.fn()
                }
            }
        }))
    };
});

describe('PlannerAgent', () => {
    let planner: PlannerAgent;
    let mockOpenAI: jest.Mocked<typeof OpenAI>;

    const EXAMPLE_RESPONSE = {
        planId: "test-123",
        parent: { 
            id: 0, 
            title: "Build User-Profile", 
            description: "Create user profile system", 
            ownerMode: "PM" 
        },
        tasks: [
            { id: 1, parentId: 0, title: "DB Schema", description: "Define tables", ownerMode: "Architect" },
            { id: 2, parentId: 0, title: "Models", description: "Implement ORM models", ownerMode: "Code" },
            { id: 3, parentId: 2, title: "Model Tests", description: "Write unit tests for models", ownerMode: "TestGen" },
            { id: 4, parentId: 0, title: "API Endpoints", description: "Controllers & routes", ownerMode: "Code" },
            { id: 5, parentId: 4, title: "Endpoint Tests", description: "Integration tests", ownerMode: "TestGen" }
        ]
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockOpenAI = OpenAI as jest.Mocked<typeof OpenAI>;
        planner = new PlannerAgent();

        // Setup mock response
        mockOpenAI.prototype.chat.completions.create.mockResolvedValue({
            choices: [
                {
                    message: {
                        content: JSON.stringify(EXAMPLE_RESPONSE)
                    }
                }
            ]
        } as any);
    });

    it('should generate a valid plan tree', async () => {
        const prompt = "Create a user profile system with API endpoints";
        const result = await planner.createPlanTree(prompt);

        // Verify plan structure
        expect(result.planId).toBeDefined();
        expect(result.parent.id).toBe(0);
        expect(result.parent.ownerMode).toBe('PM');
        expect(result.tasks.length).toBe(5);

        // Verify task relationships
        const modelTest = result.tasks.find(t => t.id === 3);
        expect(modelTest?.parentId).toBe(2);
        expect(modelTest?.ownerMode).toBe('TestGen');

        const endpointTest = result.tasks.find(t => t.id === 5);
        expect(endpointTest?.parentId).toBe(4);
        expect(endpointTest?.ownerMode).toBe('TestGen');
    });

    it('should throw error for invalid plan structure', async () => {
        mockOpenAI.prototype.chat.completions.create.mockResolvedValue({
            choices: [
                {
                    message: {
                        content: JSON.stringify({ invalid: "structure" })
                    }
                }
            ]
        } as any);

        await expect(planner.createPlanTree("test")).rejects.toThrow('Invalid plan structure');
    });

    it('should throw error for invalid parent links', async () => {
        const invalidResponse = { ...EXAMPLE_RESPONSE };
        invalidResponse.tasks[0].parentId = 999; // Invalid parent ID

        mockOpenAI.prototype.chat.completions.create.mockResolvedValue({
            choices: [
                {
                    message: {
                        content: JSON.stringify(invalidResponse)
                    }
                }
            ]
        } as any);

        await expect(planner.createPlanTree("test")).rejects.toThrow('Invalid parentId');
    });
});