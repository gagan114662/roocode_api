import { Router, Response, NextFunction } from 'express';
import { RequestHandler } from 'express-serve-static-core';
import { AuthenticatedRequest, authorize } from '../middleware/auth';
import { FileSystemService } from '../../services/filesystem';

const router = Router();
const fileSystem = new FileSystemService(process.cwd());

interface ExecuteToolBody {
    toolName: string;
    parameters: Record<string, unknown>;
}

interface TypedRequestWithBody<T> extends AuthenticatedRequest {
    body: T;
}

// List available tools
const listTools: RequestHandler = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void => {
    try {
        const availableTools = [
            {
                name: 'read_file',
                description: 'Read contents of a file',
                parameters: ['path', 'start_line', 'end_line']
            },
            {
                name: 'write_to_file',
                description: 'Write content to a file',
                parameters: ['path', 'content', 'line_count']
            },
            {
                name: 'search_files',
                description: 'Search files using regex',
                parameters: ['path', 'regex', 'file_pattern']
            }
        ];

        res.json({
            status: 'success',
            data: {
                tools: availableTools
            }
        });
    } catch (error) {
        next(error);
    }
};

// Execute a tool
const executeTool: RequestHandler = async (
    req: TypedRequestWithBody<ExecuteToolBody>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const { toolName, parameters } = req.body;

    if (!toolName) {
        res.status(400).json({
            status: 'error',
            message: 'Tool name is required'
        });
        return;
    }

    try {
        switch (toolName) {
            case 'write_to_file': {
                const { path, content } = parameters as { path: string; content: string };
                if (!path || !content) {
                    res.status(400).json({
                        status: 'error',
                        message: 'path and content are required for write_to_file'
                    });
                    return;
                }
                await fileSystem.writeFile(path, content);
                break;
            }
            case 'read_file': {
                const { path, start_line, end_line } = parameters as { path: string; start_line?: number; end_line?: number };
                if (!path) {
                    res.status(400).json({
                        status: 'error',
                        message: 'path is required for read_file'
                    });
                    return;
                }
                const content = await fileSystem.readFile(path, start_line, end_line);
                res.json({
                    status: 'success',
                    data: {
                        toolName,
                        content
                    }
                });
                return;
            }
            case 'search_files': {
                const { path, regex, file_pattern } = parameters as { path: string; regex: string; file_pattern?: string };
                if (!path || !regex) {
                    res.status(400).json({
                        status: 'error',
                        message: 'path and regex are required for search_files'
                    });
                    return;
                }
                await fileSystem.searchFiles(path, regex, file_pattern);
                break;
            }
            default:
                res.status(400).json({
                    status: 'error',
                    message: `Unknown tool: ${toolName}`
                });
                return;
        }

        res.json({
            status: 'success',
            data: {
                toolName,
                result: `Tool ${toolName} executed successfully with parameters: ${JSON.stringify(parameters)}`,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get tool execution status
const getToolStatus: RequestHandler = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void => {
    const { executionId } = req.params;

    try {
        res.json({
            status: 'success',
            data: {
                executionId,
                status: 'completed',
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        next(error);
    }
};

// Register routes with middleware
router.get('/', authorize(['read']), listTools);
router.post('/execute', authorize(['write']), executeTool);
router.get('/status/:executionId', authorize(['read']), getToolStatus);

export const toolsRouter = router;