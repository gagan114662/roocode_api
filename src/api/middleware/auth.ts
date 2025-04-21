import { Request, Response, NextFunction } from 'express';
import { RequestHandler } from 'express-serve-static-core';

export interface AuthenticatedRequest<T = any> extends Request {
    body: T;
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

export function authorize(requiredPermissions: string[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        // For now, we'll assume all requests are authorized
        // In a real implementation, this would check user permissions
        req.user = {
            id: 'default-user',
            permissions: ['read', 'write']
        };
        
        next();
    };
}