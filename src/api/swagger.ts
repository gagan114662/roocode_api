import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const apiSpec = {
    openapi: '3.0.0',
    info: {
        title: 'Roo Code API',
        version: '1.0.0',
        description: 'API for programmatic access to Roo Code functionality',
    },
    servers: [
        {
            url: '/api/v1',
            description: 'API v1',
        },
    ],
    components: {
        securitySchemes: {
            ApiKeyAuth: {
                type: 'apiKey',
                in: 'header',
                name: 'x-api-key',
            },
            BearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
        schemas: {
            Error: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'error' },
                    message: { type: 'string' },
                },
            },
            TerminalCommand: {
                type: 'object',
                properties: {
                    command: {
                        type: 'string',
                        description: 'Command to execute',
                    },
                    cwd: {
                        type: 'string',
                        description: 'Working directory for command execution',
                    },
                },
                required: ['command'],
            },
            TerminalResponse: {
                type: 'object',
                properties: {
                    stdout: { type: 'string' },
                    stderr: { type: 'string' },
                    command: { type: 'string' },
                    cwd: { type: 'string' },
                    timestamp: { type: 'string' },
                },
            },
        },
    },
    security: [
        { ApiKeyAuth: [] },
        { BearerAuth: [] },
    ],
    paths: {
        '/terminal/execute': {
            post: {
                summary: 'Execute a terminal command',
                tags: ['Terminal'],
                security: [{ ApiKeyAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/TerminalCommand',
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Command executed successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string', example: 'success' },
                                        data: {
                                            $ref: '#/components/schemas/TerminalResponse',
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '400': {
                        description: 'Invalid request',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/Error',
                                },
                            },
                        },
                    },
                },
            },
        },
        '/terminal/pwd': {
            get: {
                summary: 'Get current working directory',
                tags: ['Terminal'],
                security: [{ ApiKeyAuth: [] }],
                responses: {
                    '200': {
                        description: 'Current working directory',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string', example: 'success' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                cwd: { type: 'string' },
                                                timestamp: { type: 'string' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/chat/message': {
            post: {
                summary: 'Send a message to Roo',
                tags: ['Chat'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ChatMessage',
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Message processed successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string', example: 'success' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                response: { type: 'string' },
                                                mode: { type: 'string' },
                                                timestamp: { type: 'string' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};

export function setupSwagger(app: Express): void {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(apiSpec));
}