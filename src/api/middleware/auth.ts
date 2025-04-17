import { Request, Response, NextFunction } from 'express';
import { RequestHandler } from 'express-serve-static-core';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        permissions: string[];
    };
}

const TEST_API_KEY = 'test-key';

export const authenticate: RequestHandler = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void => {
    const apiKey = req.header('X-API-Key');
    
    if (!apiKey) {
        res.status(401).json({
            status: 'error',
            message: 'Authentication required'
        });
        return;
    }

    // For testing purposes, grant all permissions to test key
    if (apiKey === TEST_API_KEY) {
        req.user = {
            id: 'test-user',
            permissions: ['read', 'write', 'execute', 'admin']
        };
        next();
        return;
    }

    // Here you would typically validate the API key against a database
    // and retrieve the associated permissions
    req.user = {
        id: 'user-1',
        permissions: ['read', 'write']
    };

    next();
};

export const authorize = (requiredPermissions: string[]): RequestHandler => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication required'
            });
            return;
        }

        const hasRequiredPermissions = requiredPermissions.every(
            permission => req.user?.permissions.includes(permission)
        );

        if (!hasRequiredPermissions) {
            res.status(403).json({
                status: 'error',
                message: 'Insufficient permissions'
            });
            return;
        }

        next();
    };
};