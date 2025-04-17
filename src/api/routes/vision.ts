import { Router, Response, NextFunction } from 'express';
import { RequestHandler } from 'express-serve-static-core';
import { AuthenticatedRequest, authorize } from '../middleware/auth';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { chatService } from '../services/chat-service';

const router = Router();

interface VisionRequest {
    image: string; // base64 encoded image
    context?: string; // additional context about the IDE state
}

interface TypedRequestWithBody<T> extends AuthenticatedRequest {
    body: T;
}

// Temporary directory for saving images
const tempDir = path.join(os.tmpdir(), 'roocode-vision');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// Process image with Ollama vision model
const analyzeImage: RequestHandler = async (
    req: TypedRequestWithBody<VisionRequest>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { image, context } = req.body;

        if (!image) {
            res.status(400).json({
                status: 'error',
                message: 'Image is required'
            });
            return;
        }

        // Save base64 image to temp file
        const imageBuffer = Buffer.from(image.split(',')[1] || image, 'base64');
        const imageId = crypto.randomUUID();
        const imagePath = path.join(tempDir, `${imageId}.png`);
        fs.writeFileSync(imagePath, imageBuffer);

        // Process with Ollama vision model
        try {
            const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
            const ollamaModel = process.env.OLLAMA_VISION_MODEL || 'llava:latest';

            const response = await axios.post(
                `${ollamaUrl}/api/generate`,
                {
                    model: ollamaModel,
                    prompt: `You are an expert programmer. Analyze this screenshot of an IDE and identify any errors, warnings, or problems. ${context || ''}`,
                    images: [fs.readFileSync(imagePath).toString('base64')]
                }
            );

            // Clean up temp file
            fs.unlinkSync(imagePath);

            // Extract analysis from Ollama response
            const analysis = response.data.response;

            // Send the analysis to chat service for resolution
            const chatResponse = await chatService.handleMessage(
                `I need help fixing this issue from my IDE: ${analysis}`,
                'debug'
            );

            res.json({
                status: 'success',
                data: {
                    analysis,
                    resolution: chatResponse,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Ollama vision error:', error);
            
            // Fallback to simple error extraction
            const errorMessage = 'Unable to process image with vision model. Please provide the error details as text.';
            
            res.json({
                status: 'error',
                message: errorMessage,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        next(error);
    }
};

// Register routes with middleware
router.post('/analyze', authorize(['read']), analyzeImage);

export const visionRouter = router;