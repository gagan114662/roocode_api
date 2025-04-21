import { Router, Response, NextFunction } from 'express';
import { RequestHandler, Query as ExpressQuery } from 'express-serve-static-core';
import { AuthenticatedRequest, authorize } from '../middleware/auth';
import { FileSystemService } from '../../services/filesystem';
import * as path from 'path';

const router = Router();
const fileSystem = new FileSystemService(process.cwd());

interface FileOperationBody {
    path: string;
    content?: string;
    lineCount?: number;
    startLine?: number;
    endLine?: number;
    regex?: string;
    filePattern?: string;
}

interface TypedRequestWithBody<T> extends AuthenticatedRequest {
    body: T;
}

interface ListFilesQuery extends ExpressQuery {
    path?: string;
    recursive?: string;
}

// List files in directory
const listFiles: RequestHandler<{}, any, any, ListFilesQuery> = async (
    req,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const dirPath = req.query.path;
    const recursive = req.query.recursive === 'true';

    if (!dirPath) {
        res.status(400).json({
            status: 'error',
            message: 'Path parameter is required'
        });
        return;
    }

    try {
        const files = await fileSystem.listFiles(dirPath as string, recursive);
        res.json({
            status: 'success',
            data: {
                path: dirPath,
                files,
                recursive
            }
        });
    } catch (error) {
        next(error);
    }
};

// Read file content
const readFile: RequestHandler = async (
    req: TypedRequestWithBody<FileOperationBody>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const { path: filePath, startLine, endLine } = req.body;

    if (!filePath) {
        res.status(400).json({
            status: 'error',
            message: 'Path parameter is required'
        });
        return;
    }

    try {
        const content = await fileSystem.readFile(filePath, startLine, endLine);
        res.json({
            status: 'success',
            data: {
                path: filePath,
                content,
                startLine,
                endLine
            }
        });
    } catch (error) {
        next(error);
    }
};

// Write to file
const writeFile: RequestHandler = async (
    req: TypedRequestWithBody<FileOperationBody>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const { path: filePath, content, lineCount } = req.body;

    if (!filePath || !content) {
        res.status(400).json({
            status: 'error',
            message: 'Path and content parameters are required'
        });
        return;
    }

    try {
        await fileSystem.writeFile(filePath, content);
        res.json({
            status: 'success',
            data: {
                path: filePath,
                lineCount: content.split('\n').length,
                message: 'File written successfully'
            }
        });
    } catch (error) {
        next(error);
    }
};

// Search files
const searchFiles: RequestHandler = async (
    req: TypedRequestWithBody<FileOperationBody>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const { path: dirPath, regex, filePattern } = req.body;

    if (!dirPath || !regex) {
        res.status(400).json({
            status: 'error',
            message: 'Path and regex parameters are required'
        });
        return;
    }

    try {
        const matches = await fileSystem.searchFiles(dirPath, regex, filePattern);
        res.json({
            status: 'success',
            data: {
                path: dirPath,
                regex,
                filePattern,
                matches
            }
        });
    } catch (error) {
        next(error);
    }
};

// Register routes with middleware
router.get('/list', authorize(['read']), listFiles);
router.post('/read', authorize(['read']), readFile);
router.post('/write', authorize(['write']), writeFile);
router.post('/search', authorize(['read']), searchFiles);

export const filesRouter = router;