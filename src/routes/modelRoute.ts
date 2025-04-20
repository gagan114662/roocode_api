import { Router } from 'express';
import { ModelRouterService } from '../services/models/ModelRouterService';
import { openai } from '../providers/openaiProvider';

const router = Router();
const routerSvc = new ModelRouterService(openai);

router.post('/route', async (req, res, next) => {
  try {
    const { prompt, ownerMode } = req.body;

    if (!prompt || !ownerMode) {
      return res.status(400).json({
        error: 'Missing required fields: prompt and ownerMode are required'
      });
    }

    const reply = await routerSvc.route(prompt, ownerMode);
    
    res.json({
      reply,
      model: routerSvc.getModelForMode(ownerMode),
      ownerMode,
      promptLength: prompt.length
    });
  } catch (err) {
    next(err);
  }
});

router.get('/models', (req, res) => {
  const routerSvc = new ModelRouterService(openai);
  const modes = ['code', 'debug', 'testgen', 'cicd', 'refactor', 'docgen'];
  
  const modelMappings = modes.reduce((acc, mode) => {
    acc[mode] = routerSvc.getModelForMode(mode);
    return acc;
  }, {} as Record<string, string>);

  res.json({
    modelMappings,
    costThreshold: process.env.COST_THRESHOLD || '0.001',
    localModel: process.env.OLLAMA_MODEL || 'llama2'
  });
});

export default router;
