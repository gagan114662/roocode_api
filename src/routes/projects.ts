import { Router, Response, NextFunction, RequestHandler } from 'express';
import { ParsedQs } from 'qs';
import { AuthenticatedRequest } from '../middleware/auth';
import { ProjectService } from '../services/project.service';
import { detectMode, IntentMode } from '../services/intentRouter';

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
            data: {
                projectId,
                message: 'Project initialized successfully'
            }
        });
    } catch (error) {
        next(error);
    }
});

// Get project files
router.get('/:projectId/files', async (req: ProjectRequest, res: Response, next: NextFunction) => {
    try {
        const { projectId } = req.params;
        const files = await projectService.getProjectFiles(projectId);
        res.json({
            status: 'success',
            data: {
                projectId,
                files
            }
        });
    } catch (error) {
        next(error);
    }
});

// Get file content
router.get('/:projectId/files/:filePath(*)', async (req: ProjectRequest, res: Response, next: NextFunction) => {
    try {
        const { projectId, filePath } = req.params;
        
        if (!filePath) {
            res.status(400).json({
                status: 'error',
                message: 'File path is required'
            });
            return;
        }
        
        const content = await projectService.readFile(projectId, filePath);
        
        if (!content) {
            res.status(404).json({
                status: 'error',
                message: 'File not found'
            });
            return;
        }
        
        res.json({
            status: 'success',
            data: {
                projectId,
                filePath,
                content
            }
        });
    } catch (error) {
        next(error);
    }
});

// Create or update file
router.post('/:projectId/files/:filePath(*)', async (req: ProjectRequest, res: Response, next: NextFunction) => {
    try {
        const { projectId, filePath } = req.params;
        const { content } = req.body;
        
        if (!filePath) {
            res.status(400).json({
                status: 'error',
                message: 'File path is required'
            });
            return;
        }
        
        if (!content) {
            res.status(400).json({
                status: 'error',
                message: 'Content is required'
            });
            return;
        }
        
        await projectService.writeFile(projectId, filePath, content);
        
        res.json({
            status: 'success',
            data: {
                projectId,
                filePath,
                message: 'File created/updated successfully'
            }
        });
    } catch (error) {
        next(error);
    }
});

// Delete file
router.delete('/:projectId/files/:filePath(*)', async (req: ProjectRequest, res: Response, next: NextFunction) => {
    try {
        const { projectId, filePath } = req.params;
        
        if (!filePath) {
            res.status(400).json({
                status: 'error',
                message: 'File path is required'
            });
            return;
        }
        
        await projectService.deleteFile(projectId, filePath);
        
        res.json({
            status: 'success',
            data: {
                projectId,
                filePath,
                message: 'File deleted successfully'
            }
        });
    } catch (error) {
        next(error);
    }
});

// Commit changes
router.post('/:projectId/commit', async (req: ProjectRequest, res: Response, next: NextFunction) => {
    try {
        const { projectId } = req.params;
        const { description } = req.body;
        
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
            data: {
                projectId,
                message: 'Changes committed successfully'
            }
        });
    } catch (error) {
        next(error);
    }
});

// Mode handler type definition
type ModeHandler = (req: ProjectRequest, res: Response, next: NextFunction) => Promise<void>;

// Mode handlers for different intents
const modeHandlers: Record<IntentMode, ModeHandler> = {
    // Scaffold mode handler
    scaffold: async (req: ProjectRequest, res: Response, next: NextFunction) => {
        try {
            const { projectId } = req.params;
            const { prompt } = req.body;
            
            // TODO: Implement scaffold mode logic
            
            res.json({
                status: 'success',
                data: {
                    projectId,
                    mode: 'scaffold',
                    message: 'Scaffold mode executed',
                    prompt
                }
            });
        } catch (error) {
            next(error);
        }
    },
    
    // Refactor mode handler
    refactor: async (req: ProjectRequest, res: Response, next: NextFunction) => {
        try {
            const { projectId } = req.params;
            const { prompt } = req.body;
            
            // TODO: Implement refactor mode logic
            
            res.json({
                status: 'success',
                data: {
                    projectId,
                    mode: 'refactor',
                    message: 'Refactor mode executed',
                    prompt
                }
            });
        } catch (error) {
            next(error);
        }
    },
    
    // TestGen mode handler
    testgen: async (req: ProjectRequest, res: Response, next: NextFunction) => {
        try {
            const { projectId } = req.params;
            const { prompt } = req.body;
            
            // TODO: Implement testgen mode logic
            
            res.json({
                status: 'success',
                data: {
                    projectId,
                    mode: 'testgen',
                    message: 'TestGen mode executed',
                    prompt
                }
            });
        } catch (error) {
            next(error);
        }
    },
    
    // CICD mode handler
    cicd: async (req: ProjectRequest, res: Response, next: NextFunction) => {
        try {
            const { projectId } = req.params;
            const { prompt } = req.body;
            
            // TODO: Implement cicd mode logic
            
            res.json({
                status: 'success',
                data: {
                    projectId,
                    mode: 'cicd',
                    message: 'CICD mode executed',
                    prompt
                }
            });
        } catch (error) {
            next(error);
        }
    },
    
    // DocGen mode handler
    docgen: async (req: ProjectRequest, res: Response, next: NextFunction) => {
        try {
            const { projectId } = req.params;
            const { prompt } = req.body;
            
            // TODO: Implement docgen mode logic
            
            res.json({
                status: 'success',
                data: {
                    projectId,
                    mode: 'docgen',
                    message: 'DocGen mode executed',
                    prompt
                }
            });
        } catch (error) {
            next(error);
        }
    },
    
    // Code mode handler (default)
    code: async (req: ProjectRequest, res: Response, next: NextFunction) => {
        try {
            const { projectId } = req.params;
            const { prompt } = req.body;
            
            // TODO: Implement code mode logic
            
            res.json({
                status: 'success',
                data: {
                    projectId,
                    mode: 'code',
                    message: 'Code mode executed',
                    prompt
                }
            });
        } catch (error) {
            next(error);
        }
    }
};

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
        
        // Get the appropriate handler for the detected mode
        const handler = modeHandlers[mode];
        
        if (!handler) {
            res.status(400).json({
                status: 'error',
                message: `Unknown mode: ${mode}`
            });
            return;
        }
        
        // Execute the handler
        return handler(req, res, next);
    } catch (error) {
        next(error);
    }
});

export const projectsRouter = router;