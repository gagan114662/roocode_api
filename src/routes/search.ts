import { Router } from 'express';
import { VectorContextService } from '../services/context/VectorContextService';

const router = Router();
const vectorService = new VectorContextService();

/**
 * Search project codebase
 */
router.get('/projects/:projectId/search', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { q: query, k: topK = '5' } = req.query as { q?: string; k?: string };

    if (!query) {
      return res.status(400).json({ error: 'Missing required query parameter `q`' });
    }

    const results = await vectorService.search(
      projectId,
      query,
      parseInt(topK, 10)
    );

    res.json({
      query,
      topK: parseInt(topK, 10),
      results,
      metadata: {
        projectId,
        timestamp: new Date().toISOString(),
        resultCount: results.length
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Manually trigger indexing
 */
router.post('/projects/:projectId/index', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { clean = false } = req.query;

    if (clean) {
      await vectorService.deleteProjectVectors(projectId);
    }

    const chunkCount = await vectorService.indexProject(projectId);

    res.json({
      projectId,
      status: 'success',
      metadata: {
        chunkCount,
        cleaned: clean,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Clean up project vectors
 */
router.delete('/projects/:projectId/vectors', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    await vectorService.deleteProjectVectors(projectId);

    res.json({
      projectId,
      status: 'success',
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
