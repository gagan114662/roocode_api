# Roo Code API

This is the API layer for Roo Code that enables external systems to interact with Roo Code's functionalities programmatically.

## Features

- Chat interface with Roo
- RESTful API endpoints
- Authentication and authorization
- Rate limiting
- Swagger documentation
- MCP server integration
- File operations
- Tool execution
- Mode management

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
Create a `.env` file in the project root with:
```env
PORT=3000
JWT_SECRET=your-secret-key
NODE_ENV=development
```

3. Start the server:
```bash
npx ts-node -r dotenv/config src/api/start.ts
```

## API Documentation

Once the server is running, visit `http://localhost:3000/api-docs` to view the Swagger documentation.

## Authentication

The API supports two authentication methods:

1. API Key Authentication:
```http
X-API-Key: your-api-key
```

2. JWT Bearer Authentication:
```http
Authorization: Bearer your-jwt-token
```

## Core Endpoints

### Chat

- `POST /api/v1/chat/message` - Send a message to Roo
- `GET /api/v1/chat/history` - Get chat history

Example chat interaction:
```bash
curl -X POST http://localhost:3000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "message": "Create a todo app using React",
    "mode": "code"
  }'
```

### Modes

- `GET /api/v1/modes` - List available modes
- `GET /api/v1/modes/current` - Get current mode
- `POST /api/v1/modes/switch` - Switch to a different mode

### Tools

- `GET /api/v1/tools` - List available tools
- `POST /api/v1/tools/execute` - Execute a tool
- `GET /api/v1/tools/status/:executionId` - Get tool execution status

### Files

- `GET /api/v1/files/list` - List files in directory
- `POST /api/v1/files/read` - Read file content
- `POST /api/v1/files/write` - Write to file
- `POST /api/v1/files/search` - Search files

### MCP

- `GET /api/v1/mcp/servers` - List MCP servers
- `POST /api/v1/mcp/execute` - Execute MCP tool
- `POST /api/v1/mcp/access` - Access MCP resource
- `GET /api/v1/mcp/status/:operationId` - Get MCP operation status

## Example Usage

### Chat with Roo
```bash
curl -X POST http://localhost:3000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "message": "What are the best practices for React development?",
    "mode": "ask"
  }'
```

### Switch Mode
```bash
curl -X POST http://localhost:3000/api/v1/modes/switch \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"mode": "code", "reason": "Starting development"}'
```

### Execute Tool
```bash
curl -X POST http://localhost:3000/api/v1/tools/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "toolName": "read_file",
    "parameters": {
      "path": "src/main.ts",
      "startLine": 1,
      "endLine": 10
    }
  }'
```

## Error Handling

The API uses standard HTTP status codes and returns errors in the following format:

```json
{
  "status": "error",
  "message": "Error description",
  "error": "Detailed error information (development mode only)"
}
```

## Rate Limiting

The API implements rate limiting with the following default configuration:
- Window: 15 minutes
- Max requests per window: 100

## Development

1. Run in development mode:
```bash
NODE_ENV=development npx ts-node -r dotenv/config src/api/start.ts
```

2. Run tests:
```bash
npm test
```

3. Build for production:
```bash
npm run build
```

## Security Considerations

1. Always use HTTPS in production
2. Keep API keys and JWT secrets secure
3. Regularly rotate API keys
4. Monitor API usage for suspicious activity
5. Implement proper input validation

## License

This API is part of the Roo Code project and is subject to its licensing terms.