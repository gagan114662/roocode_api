import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PlanExecutor, createPlanExecutor } from '../PlanExecutor';
import { PlanTree } from '../../../types/plan';

// Mock dependencies
jest.mock('../../JobQueueService');
jest.mock('../../project.service');

describe('PlanExecutor', () => {
  let planExecutor: PlanExecutor;
  let mockJobQueue: any;
  let mockProjectService: any;

  const EXAMPLE_PLAN: PlanTree = {
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
    
    // Setup mocks
    mockJobQueue = {
      addJob: jest.fn().mockResolvedValue('job-123'),
      getJob: jest.fn(),
      getJobStatus: jest.fn(),
      ensureConnection: jest.fn().mockResolvedValue(undefined),
      removeJob: jest.fn().mockResolvedValue(undefined),
      getQueueStatus: jest.fn().mockResolvedValue({
        waiting: 0, active: 0, completed: 0, failed: 0, total: 0
      }),
      cleanup: jest.fn().mockResolvedValue(undefined)
    };
    
    mockProjectService = {
      readFile: jest.fn().mockResolvedValue('{}'),
      writeFile: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue(undefined),
      initializeProject: jest.fn().mockResolvedValue(undefined),
      getProjectFiles: jest.fn().mockResolvedValue([]),
      createFile: jest.fn().mockResolvedValue(undefined),
      deleteFile: jest.fn().mockResolvedValue(undefined),
      renameFile: jest.fn().mockResolvedValue(undefined)
    };
    
    planExecutor = createPlanExecutor(mockJobQueue, mockProjectService);
  });

  it('should execute tasks in depth-first order', async () => {
    // Setup job queue to simulate successful job completion
    mockJobQueue.getJobStatus
      .mockResolvedValueOnce('completed') // Parent task
      .mockResolvedValueOnce('completed') // Task 1
      .mockResolvedValueOnce('completed') // Task 2
      .mockResolvedValueOnce('completed') // Task 3 (child of Task 2)
      .mockResolvedValueOnce('completed') // Task 4
      .mockResolvedValueOnce('completed'); // Task 5 (child of Task 4)
    
    mockJobQueue.getJob.mockResolvedValue({
      result: { 
        status: 'completed',
        data: { success: true } 
      }
    });

    // Execute plan
    await planExecutor.executeTree(EXAMPLE_PLAN, 'test-project');

    // Verify tasks were executed in the correct order
    const executionOrder = mockJobQueue.addJob.mock.calls.map(call => {
      const options = call[1].options;
      return options?.taskId;
    });

    // Expected order: parent (0), then depth-first traversal
    expect(executionOrder).toEqual([0, 1, 2, 3, 4, 5]);

    // Verify commit was called for each task
    expect(mockProjectService.commit).toHaveBeenCalledTimes(6);
    
    // Verify execution history was saved
    expect(mockProjectService.writeFile).toHaveBeenCalledWith(
      'test-project',
      expect.stringMatching(/plan-test-123-history\.json/),
      expect.any(String)
    );
  });

  it('should handle task failures', async () => {
    // Setup job queue to simulate a failed task
    mockJobQueue.getJobStatus
      .mockResolvedValueOnce('completed') // Parent task
      .mockResolvedValueOnce('completed') // Task 1
      .mockResolvedValueOnce('failed');   // Task 2 fails
    
    mockJobQueue.getJob
      .mockResolvedValueOnce({ result: { status: 'completed', data: { success: true } } })
      .mockResolvedValueOnce({ result: { status: 'completed', data: { success: true } } })
      .mockResolvedValueOnce({ result: { status: 'failed', error: 'Task failed' } });

    // Execute plan and expect it to throw
    await expect(planExecutor.executeTree(EXAMPLE_PLAN, 'test-project'))
      .rejects
      .toThrow('Task failed');

    // Verify only the first three tasks were attempted
    expect(mockJobQueue.addJob).toHaveBeenCalledTimes(3);
    
    // Verify commit was called only for successful tasks
    expect(mockProjectService.commit).toHaveBeenCalledTimes(2);
    
    // Verify execution history includes the failure
    const history = planExecutor.getExecutionHistory('test-123');
    expect(history).toBeDefined();
    expect(history?.tasks).toHaveLength(3);
    expect(history?.tasks[2].status).toBe('failed');
  });

  it('should load execution history from file if available', async () => {
    const mockHistory = {
      planId: 'test-123',
      tasks: [
        { taskId: 0, status: 'success', timestamp: new Date() },
        { taskId: 1, status: 'success', timestamp: new Date() }
      ]
    };
    
    mockProjectService.readFile.mockResolvedValue(JSON.stringify(mockHistory));
    
    const history = await planExecutor.loadExecutionHistory('test-project', 'test-123');
    
    expect(history).toEqual(mockHistory);
    expect(mockProjectService.readFile).toHaveBeenCalledWith(
      'test-project',
      'plan-test-123-history.json'
    );
  });

  it('should return null when no execution history is found', async () => {
    mockProjectService.readFile.mockResolvedValue('');
    
    const history = await planExecutor.loadExecutionHistory('test-project', 'test-123');
    
    expect(history).toBeNull();
  });
});