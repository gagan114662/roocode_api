import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
    userId?: string;
    apiKey?: string;
}

type Permission = 'read' | 'write' | 'admin';

export const authorize = (requiredPermissions: Permission[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const apiKey = req.headers['x-api-key'] as string;

        if (!apiKey) {
            return res.status(401).json({
                status: 'error',
                message: 'API key is required'
            });
        }

        // TODO: Implement proper API key validation and permission checking
        // For now, we'll use a simple test key
        if (apiKey === 'test-key') {
            req.apiKey = apiKey;
            // Mock user ID for development
            req.userId = 'test-user';
            return next();
        }

        return res.status(403).json({
            status: 'error',
            message: 'Invalid API key'
        });
    };
};