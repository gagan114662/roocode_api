import { Router, Response, NextFunction } from 'express';
import { RequestHandler } from 'express-serve-static-core';
import { AuthenticatedRequest, authorize } from '../middleware/auth';
import { ProjectService, ProjectConfig } from '../../services/project/ProjectService';
import { ParsedQs } from 'qs';

const router = Router();

interface ProjectBody {
    id: string;
    description?: string;
}

interface CommitBody {
    message: string;
}

interface RevertBody {
    commitHash: string;
}

interface DiffQuery extends ParsedQs {
    fromCommit?: string;
    toCommit?: string;
    [key: string]: string | undefined;
}

// Initialize a new project
const initProject: RequestHandler = async (
    req: AuthenticatedRequest & { body: ProjectBody },
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id, description } = req.body;

        if (!id) {
            res.status(400).json({
                status: 'error',
                message: 'Project ID is required'
            });
            return;
        }

        const projectService = new ProjectService(id);
        await projectService.initialize();

        const config: ProjectConfig = {
            id,
            description,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await projectService.saveConfig(config);

        res.json({
            status: 'success',
            data: {
                id,
                path: await projectService.getProjectPath()
            }
        });
    } catch (error) {
        next(error);
    }
};

// Create a commit
const createCommit: RequestHandler<{id: string}, any, CommitBody> = async (
    req: AuthenticatedRequest & { body: CommitBody; params: { id: string } },
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { message } = req.body;

        if (!message) {
            res.status(400).json({
                status: 'error',
                message: 'Commit message is required'
            });
            return;
        }

        const projectService = new ProjectService(id);
        const commitHash = await projectService.commit(message);

        res.json({
            status: 'success',
            data: {
                commitHash
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get project diff
const getDiff: RequestHandler<{ id: string }> = async (
    req: AuthenticatedRequest & { params: { id: string }; query: ParsedQs },
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const fromCommit = req.query.fromCommit as string | undefined;
        const toCommit = req.query.toCommit as string | undefined;

        const projectService = new ProjectService(id);
        const diff = await projectService.diff(fromCommit, toCommit);

        res.json({
            status: 'success',
            data: {
                diff
            }
        });
    } catch (error) {
        next(error);
    }
};

// Revert to commit
const revertToCommit: RequestHandler<{id: string}, any, RevertBody> = async (
    req: AuthenticatedRequest & { body: RevertBody; params: { id: string } },
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { commitHash } = req.body;

        if (!commitHash) {
            res.status(400).json({
                status: 'error',
                message: 'Commit hash is required'
            });
            return;
        }

        const projectService = new ProjectService(id);
        await projectService.revert(commitHash);

        res.json({
            status: 'success',
            message: `Successfully reverted to commit ${commitHash}`
        });
    } catch (error) {
        next(error);
    }
};

// Register routes with middleware
router.post('/', authorize(['write']), initProject);
router.post('/:id/commit', authorize(['write']), createCommit);
router.get('/:id/diff', authorize(['read']), getDiff);
router.post('/:id/revert', authorize(['write']), revertToCommit);

export const projectsRouter = router;