# RooCode API Codebase Index

## Core Components

### API Routes (`src/routes/`)
- `plan.ts` - Planning and execution routes
- `upload.ts` - Image upload and management
- `memory.ts` - Project memory operations
- `search.ts` - Code search functionality

### LLM Services (`src/services/llm/`)
- `FunctionHandler.ts` - Built-in tool execution
- `MultimodalPlannerAgent.ts` - Image-aware planning agent
- `functions/` - Function definitions and validation

### Core Services (`src/services/`)
- `project/` - Project file operations
- `memory/` - Long-term memory management
- `context/` - Vector search and context

### API Layer (`src/api/`)
- `openaiProvider.ts` - Enhanced OpenAI integration
- `index.ts` - Main API setup and routing

## Testing
- `src/services/llm/__tests__/` - LLM service tests
- `src/routes/__tests__/` - API route tests
- `src/e2e/__tests__/` - End-to-end tests

## Key Features

### Planning & Execution
- Function calling with validation
- State management
- Error handling
- Response threading

### Image Support
- Image upload/management
- Vision analysis
- Combined vision + function mode
- Image metadata tracking

### Memory & Context
- Long-term memory storage
- Vector search
- Project state tracking
- Decision logging

### Security
- Input validation
- File type checking
- Size limits
- Path sanitization

## Development

### Build System
- TypeScript configuration
- ESBuild setup
- Jest test runner

### DevOps
- Docker configuration
- CI/CD workflows
- Monitoring setup
