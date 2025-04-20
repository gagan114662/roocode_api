import { Router } from 'express';
import { ModelRouterService } from '../services/models/ModelRouterService';
import { openai } from '../providers/openaiProvider';
import { OllamaModel } from '../config/ollamaModels';

const router = Router();

// Load configuration from environment
const routerConfig = {
  costThreshold: Number(process.env.COST_THRESHOLD || '0.001'),
  defaultLocalModel: (process.env.DEFAULT_LOCAL_MODEL || 'llama3:latest') as OllamaModel,
  modeLocalModelMap: process.env.MODE_LOCAL_MODEL_MAP ? 
    JSON.parse(process.env.MODE_LOCAL_MODEL_MAP) : undefined
};

const routerSvc = new ModelRouterService(openai, routerConfig);

router.post('/route', async (req, res, next) => {
  try {
    const { prompt, ownerMode } = req.body;

    if (!prompt || !ownerMode) {
      return res.status(400).json({
        error: 'Missing required fields: prompt and ownerMode are required'
      });
    }

    const startTime = Date.now();
    const reply = await routerSvc.route(prompt, ownerMode);
    const duration = Date.now() - startTime;
    
    res.json({
      reply,
      metadata: {
        selectedModel: routerSvc.getModelForMode(ownerMode),
        localModel: routerSvc.getLocalModel(ownerMode),
        ownerMode,
        promptLength: prompt.length,
        responseTimeMs: duration
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/models', (_req, res) => {
  res.json({
    // Available models and their capabilities
    localModels: routerSvc.getAvailableLocalModels(),
    modelCapabilities: routerSvc.getModelCapabilities(),
    
    // Current configuration
    config: {
      costThreshold: routerConfig.costThreshold,
      defaultLocalModel: routerConfig.defaultLocalModel,
      modeLocalModelMap: routerConfig.modeLocalModelMap
    }
  });
});

router.get('/health', async (_req, res) => {
  try {
    // Test local model connection
    await fetch('http://localhost:11434/api/health');
    
    res.json({
      status: 'healthy',
      localModelAvailable: true,
      openAIAvailable: true,
      configuration: routerConfig
    });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      localModelAvailable: false,
      openAIAvailable: true,
      error: (err as Error).message
    });
  }
});

export default router;
