import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        permissions: string[];
    };
}

export const authenticate: RequestHandler = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void => {
    const apiKey = req.headers['x-api-key'];
    const authHeader = req.headers.authorization;

    if (!apiKey && !authHeader) {
        res.status(401).json({
            status: 'error',
            message: 'Authentication required'
        });
        return;
    }

    try {
        if (apiKey) {
            validateApiKey(apiKey as string);
            req.user = {
                id: 'api-user',
                permissions: ['read', 'write']
            };
        } else if (authHeader) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET) as { id: string; permissions: string[] };
            req.user = decoded;
        }

        next();
    } catch (error) {
        res.status(401).json({
            status: 'error',
            message: 'Invalid authentication credentials'
        });
    }
};

function validateApiKey(apiKey: string): void {
    // TODO: Implement proper API key validation against a secure store
    const validApiKeys = ['test-key']; // Replace with proper API key validation
    if (!validApiKeys.includes(apiKey)) {
        throw new Error('Invalid API key');
    }
}

export const authorize = (requiredPermissions: string[]): RequestHandler => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required'
            });
            return;
        }

        const hasAllPermissions = requiredPermissions.every(
            permission => req.user?.permissions.includes(permission)
        );

        if (!hasAllPermissions) {
            res.status(403).json({
                status: 'error',
                message: 'Insufficient permissions'
            });
            return;
        }

        next();
    };
};