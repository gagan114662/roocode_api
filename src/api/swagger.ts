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
                    status: {
                        type: 'string',
                        example: 'error',
                    },
                    message: {
                        type: 'string',
                    },
                },
            },
            ChatMessage: {
                type: 'object',
                properties: {
                    message: {
                        type: 'string',
                        description: 'Message to send to Roo',
                    },
                    mode: {
                        type: 'string',
                        description: 'Optional mode to switch to before processing the message',
                    },
                },
                required: ['message'],
            },
        },
    },
    security: [
        { ApiKeyAuth: [] },
        { BearerAuth: [] },
    ],
    paths: {
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
        '/chat/history': {
            get: {
                summary: 'Get chat history',
                tags: ['Chat'],
                responses: {
                    '200': {
                        description: 'Chat history retrieved successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string', example: 'success' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                history: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            message: { type: 'string' },
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
            },
        },
        '/modes': {
            get: {
                summary: 'List available modes',
                tags: ['Modes'],
                responses: {
                    '200': {
                        description: 'List of available modes',
                    },
                },
            },
        },
        '/tools': {
            get: {
                summary: 'List available tools',
                tags: ['Tools'],
                responses: {
                    '200': {
                        description: 'List of available tools',
                    },
                },
            },
        },
        '/files/list': {
            get: {
                summary: 'List files in directory',
                tags: ['Files'],
                parameters: [
                    {
                        name: 'path',
                        in: 'query',
                        required: true,
                        schema: { type: 'string' },
                    },
                ],
                responses: {
                    '200': {
                        description: 'List of files',
                    },
                },
            },
        },
    },
};

export function setupSwagger(app: Express): void {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(apiSpec));
}