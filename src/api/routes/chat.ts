import { Router, Response, NextFunction } from 'express';
import { RequestHandler } from 'express-serve-static-core';
import { AuthenticatedRequest, authorize } from '../middleware/auth';
import { chatService } from '../services/chat-service';

const router = Router();

interface ChatMessage {
    message: string;
    mode?: 'ask' | 'code' | 'architect' | 'debug';
}

interface TypedRequestWithBody<T> extends AuthenticatedRequest {
    body: T;
}

// Send a chat message to Roo
const sendMessage: RequestHandler = async (
    req: TypedRequestWithBody<ChatMessage>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const { message, mode } = req.body;

    if (!message) {
        res.status(400).json({
            status: 'error',
            message: 'Message is required'
        });
        return;
    }

    try {
        const response = await chatService.handleMessage(message, mode);

        res.json({
            status: 'success',
            data: {
                response,
                mode: chatService.getCurrentMode(),
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get chat history
const getChatHistory: RequestHandler = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const history = await chatService.getChatHistory();

        res.json({
            status: 'success',
            data: {
                history,
                mode: chatService.getCurrentMode(),
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        next(error);
    }
};

// Clear chat history
const clearHistory: RequestHandler = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        chatService.clearHistory();

        res.json({
            status: 'success',
            message: 'Chat history cleared',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
};

// Register routes with middleware
router.post('/message', authorize(['write']), sendMessage);
router.get('/history', authorize(['read']), getChatHistory);
router.post('/clear', authorize(['write']), clearHistory);

export const chatRouter = router;