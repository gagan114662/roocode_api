import { Router, Response, NextFunction } from 'express';
import { RequestHandler } from 'express-serve-static-core';
import { AuthenticatedRequest, authorize } from '../middleware/auth';
import { modes } from '../core/modes';

const router = Router();

interface ModeSwitchBody {
    mode: string;
    reason?: string;
}

interface TypedRequestWithBody<T> extends AuthenticatedRequest {
    body: T;
}

// Get list of available modes
const listModes: RequestHandler = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void => {
    try {
        const availableModes = modes.list();
        res.json({
            status: 'success',
            data: {
                modes: availableModes
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get current mode
const getCurrentMode: RequestHandler = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void => {
    try {
        const currentMode = modes.current();
        res.json({
            status: 'success',
            data: {
                mode: currentMode
            }
        });
    } catch (error) {
        next(error);
    }
};

// Switch mode
const switchMode: RequestHandler = async (
    req: TypedRequestWithBody<ModeSwitchBody>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const { mode, reason } = req.body;

    if (!mode) {
        res.status(400).json({
            status: 'error',
            message: 'Mode parameter is required'
        });
        return;
    }

    try {
        const newMode = await modes.switch(mode, reason);
        res.json({
            status: 'success',
            data: {
                mode: newMode,
                message: `Successfully switched to ${mode} mode`
            }
        });
    } catch (error) {
        next(error);
    }
};

// Register routes with middleware
router.get('/', authorize(['read']), listModes);
router.get('/current', authorize(['read']), getCurrentMode);
router.post('/switch', authorize(['write']), switchMode);

export const modesRouter = router;