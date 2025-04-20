import { Router } from 'express';
import { OrchestratorService, TaskNode } from '../services/orchestrator/OrchestratorService';
import { CodeAgent } from '../services/agents/CodeAgent';
import { TestGenAgent } from '../services/agents/TestGenAgent';
import { ModelRouterService } from '../services/models/ModelRouterService';
import { CostForecastService } from '../services/cost/CostForecastService';
import { MemoryService } from '../services/memory/MemoryService';
import { openai } from '../providers/openaiProvider';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// Initialize services
const modelRouter = new ModelRouterService(openai);
const memoryService = new MemoryService();
const costService = new CostForecastService();

// Initialize agents
const agents = {
  code: new CodeAgent(modelRouter, memoryService),
  testgen: new TestGenAgent(modelRouter, memoryService)
};

// Initialize orchestrator
const orchestrator = new OrchestratorService(agents, costService, memoryService);

/**
 * Helper to read project plan file
 */
async function readPlanFile(projectId: string): Promise<TaskNode> {
  const planPath = path.join(process.cwd(), 'workspaces', projectId, 'plan.json');
  try {
    const content = await fs.readFile(planPath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    throw new Error(`No plan found for project: ${projectId}`);
  }
}

/**
 * Execute a project plan
 */
router.post('/projects/:projectId/orchestrate', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { context = '', modelMap = {} } = req.body;

    // Load the plan
    const plan = await readPlanFile(projectId);

    // Validate the plan
    const validationErrors = orchestrator.validatePlan(plan);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Invalid plan configuration',
        details: validationErrors
      });
    }

    // Estimate execution cost
    const estimatedCost = await orchestrator.estimatePlanCost(plan, modelMap);
    
    // Execute the plan
    const results = await orchestrator.runPlan(plan, projectId, context);

    res.json({
      results,
      metadata: {
        projectId,
        estimatedCostUSD: estimatedCost.toFixed(4),
        executionTimeMs: results.executionTime,
        taskCount: countTasks(plan),
        modelMap
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Get execution cost estimate
 */
router.get('/projects/:projectId/estimate', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { modelMap = {} } = req.query;

    // Load the plan
    const plan = await readPlanFile(projectId);

    // Validate the plan
    const validationErrors = orchestrator.validatePlan(plan);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Invalid plan configuration',
        details: validationErrors
      });
    }

    // Calculate estimated cost
    const estimatedCost = await orchestrator.estimatePlanCost(
      plan,
      modelMap as Record<string, string>
    );

    res.json({
      projectId,
      estimatedCostUSD: estimatedCost.toFixed(4),
      taskCount: countTasks(plan),
      modelMap
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Helper to count total tasks in a plan
 */
function countTasks(node: TaskNode): number {
  return 1 + node.children.reduce((sum, child) => sum + countTasks(child), 0);
}

export default router;
