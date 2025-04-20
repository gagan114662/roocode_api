import { Router, Response, NextFunction } from 'express';
import { RequestHandler } from 'express-serve-static-core';
import { AuthenticatedRequest, authorize } from '../middleware/auth';
import { qaService, QAResult } from '../../services/qa/QAService';
import { ProjectService } from '../../services/project/ProjectService';

const router = Router();

interface RunQARequest {
  projectId: string;
  checks?: ('typecheck' | 'test' | 'lint' | 'install' | 'all')[];
}

// Run QA checks on a project
const runQA: RequestHandler = async (
  req: AuthenticatedRequest & { body: RunQARequest },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { projectId, checks = ['all'] } = req.body;

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

    const results: QAResult[] = [];

    if (checks.includes('all')) {
      // Run all checks
      const allResults = await qaService.runAll(projectPath);
      results.push(...allResults);
    } else {
      // Run specific checks
      if (checks.includes('install')) {
        results.push(await qaService.installDependencies(projectPath));
      }
      
      if (checks.includes('typecheck')) {
        results.push(await qaService.runTypeCheck(projectPath));
      }
      
      if (checks.includes('test')) {
        results.push(await qaService.runTests(projectPath));
      }
      
      if (checks.includes('lint')) {
        results.push(await qaService.runLint(projectPath));
      }
    }

    res.json({
      status: 'success',
      data: {
        results,
        summary: {
          total: results.length,
          passed: results.filter(result => result.success).length,
          failed: results.filter(result => !result.success).length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Register routes with middleware
router.post('/run', authorize(['write']), runQA);

export const qaRouter = router;