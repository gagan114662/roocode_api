import { Router, Response, NextFunction } from 'express';
import { ParsedQs } from 'qs';
import { AuthenticatedRequest } from '../middleware/auth';
import { ProjectService } from '../services/project.service';
const { detectMode } = require('../services/intentRouter.js');

const router = Router();
const projectService = new ProjectService();

interface ProjectRequest extends AuthenticatedRequest {
    params: {
        projectId: string;
        filePath?: string;
    };
    query: ParsedQs;
    body: {
        content?: string;
        description?: string;
        commitHash?: string;
        prompt?: string;
    };
}

// Initialize new project
router.post('/:projectId/init', async (req: ProjectRequest, res: Response, next: NextFunction) => {
    try {
        const { projectId } = req.params;
        await projectService.initializeProject(projectId);
        res.json({
            status: 'success',
            message: `Project ${projectId} initialized successfully`
        });
    } catch (error) {
        next(error);
    }
});

// Get list of project files
router.get('/:projectId/files', async (req: ProjectRequest, res: Response, next: NextFunction) => {
    try {
        const { projectId } = req.params;
        const files = await projectService.getProjectFiles(projectId);
        res.json({
            status: 'success',
            data: { files }
        });
    } catch (error) {
        next(error);
    }
});

// Read file content
router.get('/:projectId/files/:filePath(*)', async (req: ProjectRequest, res: Response, next: NextFunction) => {
    try {
        const { projectId, filePath } = req.params;
        const content = await projectService.readFile(projectId, filePath!);
        res.json({
            status: 'success',
            data: { content }
        });
    } catch (error) {
        next(error);
    }
});

// Write file content
router.put('/:projectId/files/:filePath(*)', async (req: ProjectRequest, res: Response, next: NextFunction) => {
    try {
        const { projectId, filePath } = req.params;
        const { content } = req.body || {};

        if (!content) {
            res.status(400).json({
                status: 'error',
                message: 'Content is required'
            });
            return;
        }

        await projectService.writeFile(projectId, filePath!, content);
        res.json({
            status: 'success',
            message: `File ${filePath} updated successfully`
        });
    } catch (error) {
        next(error);
    }
});

// Commit changes
router.post('/:projectId/commit', async (req: ProjectRequest, res: Response, next: NextFunction) => {
    try {
        const { projectId } = req.params;
        const { description } = req.body || {};

        if (!description) {
            res.status(400).json({
                status: 'error',
                message: 'Commit description is required'
            });
            return;
        }

        await projectService.commit(projectId, description);
        res.json({
            status: 'success',
            message: `Changes committed successfully: ${description}`
        });
    } catch (error) {
        next(error);
    }
});

// Get diff
router.get('/:projectId/diff', async (req: ProjectRequest, res: Response, next: NextFunction) => {
    try {
        const { projectId } = req.params;
        const { fromCommit } = req.query as { fromCommit?: string };
        
        const diff = await projectService.diff(projectId, fromCommit);
        res.json({
            status: 'success',
            data: { diff }
        });
    } catch (error) {
        next(error);
    }
});

// Revert commit
router.post('/:projectId/revert', async (req: ProjectRequest, res: Response, next: NextFunction) => {
    try {
        const { projectId } = req.params;
        const { commitHash } = req.body || {};

        if (!commitHash) {
            res.status(400).json({
                status: 'error',
                message: 'Commit hash is required'
            });
            return;
        }

        await projectService.revert(projectId, commitHash);
        res.json({
            status: 'success',
            message: `Successfully reverted commit ${commitHash}`
        });
    } catch (error) {
        next(error);
    }
});

// Execute project action based on intent
router.post('/:projectId/execute', async (req: ProjectRequest, res: Response, next: NextFunction) => {
    try {
        const { projectId } = req.params;
        const { prompt } = req.body;

        if (!prompt) {
            res.status(400).json({
                status: 'error',
                message: 'Prompt is required'
            });
            return;
        }

        // Detect intent from prompt
        const mode = detectMode(prompt);

        // TODO: Call appropriate mode handler based on detected intent
        // For now, just return the detected mode
        res.json({
            status: 'success',
            data: {
                projectId,
                mode,
                message: `Intent detected as ${mode}`
            }
        });
    } catch (error) {
        next(error);
    }
});

export const projectsRouter = router;