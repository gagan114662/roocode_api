import { Router, Response, NextFunction } from 'express';
import { RequestHandler } from 'express-serve-static-core';
import { AuthenticatedRequest, authorize } from '../middleware/auth';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

interface TerminalCommand {
    command: string;
    cwd?: string;
}

interface TypedRequestWithBody<T> extends AuthenticatedRequest {
    body: T;
}

// Execute terminal command
const executeCommand: RequestHandler = async (
    req: TypedRequestWithBody<TerminalCommand>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const { command, cwd } = req.body;

    if (!command) {
        res.status(400).json({
            status: 'error',
            message: 'Command is required'
        });
        return;
    }

    try {
        // Security check - prevent dangerous commands
        const dangerousCommands = ['rm', 'rmdir', 'del', 'format', ':(){:|:&};:'];
        if (dangerousCommands.some(cmd => command.toLowerCase().includes(cmd))) {
            throw new Error('Command not allowed for security reasons');
        }

        const { stdout, stderr } = await execAsync(command, {
            cwd: cwd || process.cwd(),
            timeout: 30000 // 30 second timeout
        });

        res.json({
            status: 'success',
            data: {
                stdout,
                stderr,
                command,
                cwd: cwd || process.cwd(),
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get current working directory
const getPwd: RequestHandler = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { stdout } = await execAsync('pwd');
        
        res.json({
            status: 'success',
            data: {
                cwd: stdout.trim(),
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        next(error);
    }
};

// Register routes with middleware
router.post('/execute', authorize(['admin']), executeCommand);
router.get('/pwd', authorize(['read']), getPwd);

export const terminalRouter = router;