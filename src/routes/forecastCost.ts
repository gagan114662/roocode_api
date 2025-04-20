import { Router } from 'express';
import { CostForecastService } from '../services/cost/CostForecastService';
import fs from 'fs/promises';
import path from 'path';

const router = Router();
const costSvc = new CostForecastService();

async function readPlanFile(projectId: string) {
  const planPath = path.join(process.cwd(), 'workspaces', projectId, 'plan.json');
  try {
    const content = await fs.readFile(planPath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`No plan found for project: ${projectId}`);
    }
    throw err;
  }
}

router.get('/projects/:projectId/forecast-cost', async (req, res, next) => {
  try {
    const plan = await readPlanFile(req.params.projectId);
    const modelMap = req.body.modelMap || {};
    const cost = costSvc.estimatePlanCost(plan, modelMap);
    
    res.json({
      estimatedCostUSD: cost.toFixed(4),
      models: costSvc.getAvailableModels(),
      modelPrices: Object.fromEntries(
        costSvc.getAvailableModels().map(model => [
          model,
          costSvc.getModelPrice(model)
        ])
      ),
      taskCount: plan.tasks.length,
      modelMap: modelMap
    });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('No plan found')) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});

export default router;
