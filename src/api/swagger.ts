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
            PlannerRequest: {
                type: 'object',
                properties: {
                    requirements: {
                        type: 'string',
                        description: 'Project requirements',
                    },
                    context: {
                        type: 'string',
                        description: 'Additional context',
                    },
                    projectType: {
                        type: 'string',
                        description: 'Type of project',
                    },
                },
                required: ['requirements'],
            },
            ImplementationRequest: {
                type: 'object',
                properties: {
                    planPath: {
                        type: 'string',
                        description: 'Path to the plan file',
                    },
                    componentName: {
                        type: 'string',
                        description: 'Name of the component to implement',
                    },
                    context: {
                        type: 'string',
                        description: 'Additional context',
                    },
                },
                required: ['planPath', 'componentName'],
            },
            TestRequest: {
                type: 'object',
                properties: {
                    filePath: {
                        type: 'string',
                        description: 'Path to the file to test',
                    },
                    context: {
                        type: 'string',
                        description: 'Additional context',
                    },
                },
                required: ['filePath'],
            },
            MonitorRequest: {
                type: 'object',
                properties: {
                    directory: {
                        type: 'string',
                        description: 'Directory to scan',
                    },
                    filePattern: {
                        type: 'string',
                        description: 'Glob pattern to match files',
                    },
                    scanType: {
                        type: 'string',
                        enum: ['errors', 'security', 'performance', 'all'],
                        description: 'Type of scan to perform',
                    },
                },
                required: ['directory'],
            },
            WorkflowRequest: {
                type: 'object',
                properties: {
                    requirements: {
                        type: 'string',
                        description: 'Project requirements',
                    },
                    projectType: {
                        type: 'string',
                        description: 'Type of project (web, mobile, backend, etc.)',
                    },
                    projectDir: {
                        type: 'string',
                        description: 'Directory to create the project in',
                    },
                },
                required: ['requirements', 'projectType', 'projectDir'],
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
        '/planner/generate': {
            post: {
                summary: 'Generate a project plan from requirements',
                tags: ['Planner'],
                security: [{ ApiKeyAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/PlannerRequest',
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Plan generated successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string', example: 'success' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                plan: { type: 'object' },
                                                planPath: { type: 'string' },
                                                timestamp: { type: 'string' },
                                            },
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
        '/planner/list': {
            get: {
                summary: 'List all saved plans',
                tags: ['Planner'],
                security: [{ ApiKeyAuth: [] }],
                responses: {
                    '200': {
                        description: 'Plans retrieved successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string', example: 'success' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                plans: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            name: { type: 'string' },
                                                            path: { type: 'string' },
                                                            plan: { type: 'object' },
                                                        },
                                                    },
                                                },
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
        '/implementation/implement': {
            post: {
                summary: 'Implement a component from a plan',
                tags: ['Implementation'],
                security: [{ ApiKeyAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ImplementationRequest',
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Component implemented successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string', example: 'success' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                component: { type: 'object' },
                                                implementedFiles: {
                                                    type: 'array',
                                                    items: { type: 'string' },
                                                },
                                                timestamp: { type: 'string' },
                                            },
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
        '/implementation/test': {
            post: {
                summary: 'Generate tests for a file',
                tags: ['Implementation'],
                security: [{ ApiKeyAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/TestRequest',
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Tests generated successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string', example: 'success' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                testPath: { type: 'string' },
                                                testResults: { type: 'object' },
                                                timestamp: { type: 'string' },
                                            },
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
        '/monitor/scan': {
            post: {
                summary: 'Scan codebase for issues',
                tags: ['Monitor'],
                security: [{ ApiKeyAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/MonitorRequest',
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Codebase scanned successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string', example: 'success' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                scannedFiles: { type: 'number' },
                                                processedFiles: { type: 'number' },
                                                issues: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            file: { type: 'string' },
                                                            line: { type: 'number' },
                                                            column: { type: 'number' },
                                                            severity: { type: 'string' },
                                                            message: { type: 'string' },
                                                            code: { type: 'string' },
                                                            suggestion: { type: 'string' },
                                                        },
                                                    },
                                                },
                                                fixedIssues: { type: 'array' },
                                                reportPath: { type: 'string' },
                                                timestamp: { type: 'string' },
                                            },
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
        '/workflow/start': {
            post: {
                summary: 'Start a new project workflow',
                tags: ['Workflow'],
                security: [{ ApiKeyAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/WorkflowRequest',
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Workflow started successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string', example: 'success' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                status: { type: 'string' },
                                                message: { type: 'string' },
                                                plan: { type: 'object' },
                                                projectPath: { type: 'string' }
                                            },
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
        '/workflow/stop': {
            post: {
                summary: 'Stop an active workflow',
                tags: ['Workflow'],
                security: [{ ApiKeyAuth: [] }],
                responses: {
                    '200': {
                        description: 'Workflow stopped successfully',
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
    },
};

export function setupSwagger(app: Express): void {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(apiSpec));
}