export { startServer } from './server';
export { authenticate, authorize } from './middleware/auth';
export { modesRouter } from './routes/modes';
export { toolsRouter } from './routes/tools';
export { filesRouter } from './routes/files';
export { mcpRouter } from './routes/mcp';

// API Types
export interface APIResponse<T = any> {
    status: 'success' | 'error';
    data?: T;
    message?: string;
    error?: string;
}

export interface APIError {
    status: 'error';
    message: string;
    error?: string;
}

// Mode Types
export interface Mode {
    slug: string;
    name: string;
    description?: string;
    capabilities: string[];
}

// File Operation Types
export interface FileOperation {
    path: string;
    content?: string;
    lineCount?: number;
    startLine?: number;
    endLine?: number;
    regex?: string;
    filePattern?: string;
}

// Tool Types
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: string[];
}

// MCP Types
export interface MCPServer {
    name: string;
    status: 'connected' | 'disconnected';
    tools: string[];
    resources: string[];
}

export interface MCPToolExecution {
    serverName: string;
    toolName: string;
    arguments: Record<string, unknown>;
}

export interface MCPResourceAccess {
    serverName: string;
    uri: string;
}

// Authentication Types
export interface AuthUser {
    id: string;
    permissions: string[];
}

export interface AuthenticatedRequest extends Express.Request {
    user?: AuthUser;
}

// Re-export swagger setup
export { setupSwagger } from './swagger';
