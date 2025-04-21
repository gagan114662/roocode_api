import { Router, Response, NextFunction } from 'express';
import { RequestHandler } from 'express-serve-static-core';
import { AuthenticatedRequest, authorize } from '../middleware/auth';
import { ContextService } from '../../services/context/ContextService';
import { ProjectService } from '../../services/project/ProjectService';

const router = Router();
const contextService = ContextService.getInstance();

interface IndexProjectRequest {
  projectId: string;
}

interface GenerateContextRequest {
  projectId: string;
  prompt: string;
  maxChunks?: number;
}

// Index a project for context
const indexProject: RequestHandler = async (
  req: AuthenticatedRequest & { body: IndexProjectRequest },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      res.status(400).json({
        status: 'error',
        message: 'Project ID is required'
      });
      return;
    }

    // Get project path
    const projectService = new ProjectService(projectId);
    await projectService.initialize();
    const projectPath = await projectService.getProjectPath();

    // Index the project
    await contextService.indexProject(projectId, projectPath);

    res.json({
      status: 'success',
      message: `Project ${projectId} indexed successfully`
    });
  } catch (error) {
    next(error);
  }
};

// Generate context for a prompt
const generateContext: RequestHandler = async (
  req: AuthenticatedRequest & { body: GenerateContextRequest },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { projectId, prompt, maxChunks = 3 } = req.body;

    if (!projectId || !prompt) {
      res.status(400).json({
        status: 'error',
        message: 'Project ID and prompt are required'
      });
      return;
    }

    // Check if project is indexed
    if (!contextService.isProjectIndexed(projectId)) {
      // Get project path
      const projectService = new ProjectService(projectId);
      await projectService.initialize();
      const projectPath = await projectService.getProjectPath();

      // Index the project
      await contextService.indexProject(projectId, projectPath);
    }

    // Generate context
    const context = contextService.generateContextString(projectId, prompt, maxChunks);

    res.json({
      status: 'success',
      data: { context }
    });
  } catch (error) {
    next(error);
  }
};

// Clear project cache
const clearProjectCache: RequestHandler<{id: string}> = async (
  req: AuthenticatedRequest & { params: { id: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    contextService.clearProjectCache(id);

    res.json({
      status: 'success',
      message: `Cache for project ${id} cleared successfully`
    });
  } catch (error) {
    next(error);
  }
};

// Register routes with middleware
router.post('/index', authorize(['write']), indexProject);
router.post('/generate', authorize(['read']), generateContext);
router.delete('/:id/cache', authorize(['write']), clearProjectCache);

export const contextRouter = router;