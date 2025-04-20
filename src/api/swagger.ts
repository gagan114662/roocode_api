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
            ChatMessage: {
                type: 'object',
                properties: {
                    message: {
                        type: 'string',
                        description: 'Message content',
                    },
                    mode: {
                        type: 'string',
                        enum: ['ask', 'code', 'architect', 'debug'],
                        description: 'Chat mode',
                    },
                },
                required: ['message'],
            },
            VisionRequest: {
                type: 'object',
                properties: {
                    image: {
                        type: 'string',
                        format: 'binary',
                        description: 'Image file or base64 encoded image',
                    },
                    context: {
                        type: 'string',
                        description: 'Additional context about the IDE state',
                    },
                },
                required: ['image'],
            },
            VisionResponse: {
                type: 'object',
                properties: {
                    analysis: {
                        type: 'string',
                        description: 'Analysis of the image',
                    },
                    resolution: {
                        type: 'string',
                        description: 'Suggested resolution from the AI',
                    },
                    timestamp: { type: 'string' },
                },
            },
            Plan: {
                type: 'object',
                properties: {
                    description: { type: 'string' },
                    tasks: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                title: { type: 'string' },
                                description: { type: 'string' },
                                ownerMode: { type: 'string', enum: ['PM', 'Architect', 'Code', 'Debug'] }
                            }
                        }
                    }
                }
            },
            PlanResponse: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                        type: 'object',
                        properties: {
                            plan: { $ref: '#/components/schemas/Plan' }
                        }
                    }
                }
            },
            ExecutionResult: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                        type: 'object',
                        properties: {
                            results: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        taskId: { type: 'string' },
                                        output: { type: 'string' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
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
        '/chat/history': {
            get: {
                summary: 'Get chat history',
                tags: ['Chat'],
                security: [{ ApiKeyAuth: [] }],
                responses: {
                    '200': {
                        description: 'Chat history',
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
                                                            role: { type: 'string' },
                                                            content: { type: 'string' },
                                                        },
                                                    },
                                                },
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
        '/chat/clear': {
            post: {
                summary: 'Clear chat history',
                tags: ['Chat'],
                security: [{ ApiKeyAuth: [] }],
                responses: {
                    '200': {
                        description: 'Chat history cleared',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string', example: 'success' },
                                        message: { type: 'string' },
                                        timestamp: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/vision/analyze': {
            post: {
                summary: 'Analyze IDE screenshot for errors',
                tags: ['Vision'],
                security: [{ ApiKeyAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/VisionRequest',
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Image analyzed successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string', example: 'success' },
                                        data: {
                                            $ref: '#/components/schemas/VisionResponse',
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
        '/planning/create': {
            post: {
                summary: 'Create a project plan',
                tags: ['Planning'],
                security: [{ ApiKeyAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    description: { type: 'string' },
                                    projectId: { type: 'string' }
                                },
                                required: ['description', 'projectId']
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Plan created successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/PlanResponse'
                                }
                            }
                        }
                    },
                    '400': {
                        description: 'Invalid request',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/Error'
                                }
                            }
                        }
                    }
                }
            }
        },
        '/planning/execute': {
            post: {
                summary: 'Execute a project plan',
                tags: ['Planning'],
                security: [{ ApiKeyAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    projectId: { type: 'string' }
                                },
                                required: ['projectId']
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Plan executed successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ExecutionResult'
                                }
                            }
                        }
                    },
                    '400': {
                        description: 'Invalid request',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/Error'
                                }
                            }
                        }
                    }
                }
            }
        }
    },
};

export function setupSwagger(app: Express): void {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(apiSpec));
}