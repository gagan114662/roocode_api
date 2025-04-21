# RooCode API

Multimodal AI coding assistant with advanced project understanding.

## Features

### 🤖 Code Understanding
- Semantic code search
- Context-aware responses
- Project-wide analysis
- Test execution & validation

### 🖼️ Image Support
- Upload & analyze screenshots/diagrams
- Visual code review
- Combined text + image planning
- Secure file management

### 🔧 Built-in Tools
- File operations
- Test execution
- Git operations
- Memory management
- Vector search

### 🧠 Memory System
- Project state tracking
- Decision logging
- Test coverage history
- Implementation notes

### 🔒 Security
- Input validation
- File type checking
- Size limits (5MB)
- Path sanitization
- Secure file serving

## API Routes

### Planning
```typescript
POST /api/v1/projects/:id/plan
{
  prompt: string;
  images?: Array<{name: string, path?: string, url?: string}>;
  history?: ChatMessage[];
  responseId?: string;
}
```

### Image Management
```typescript
POST /api/v1/projects/:id/upload-image  // multipart/form-data
GET /api/v1/projects/:id/images
DELETE /api/v1/projects/:id/images/:filename
```

### Memory Operations
```typescript
GET /api/v1/projects/:id/memory/:section
POST /api/v1/projects/:id/memory/:section
{
  entry: string;
}
```

### Code Search
```typescript
POST /api/v1/projects/:id/search
{
  query: string;
  limit?: number;
}
```

### Function Discovery
```typescript
GET /api/v1/projects/:id/functions
POST /api/v1/projects/:id/functions/validate
```

## Development

### Setup
```bash
# Install dependencies
npm install

# Build project
npm run build

# Run development server
npm run dev
```

### Testing
```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Update snapshots
npm test -- -u
```

### Environment Variables
```bash
# Required
OPENAI_API_KEY=your_api_key
OPENAI_ORG_ID=your_org_id

# Optional with defaults
OPENAI_CHAT_MODEL=gpt-4-turbo-preview
OPENAI_VISION_MODEL=gpt-4-vision-preview
```

## Architecture

```
src/
  ├── api/          # API layer & OpenAI integration
  ├── routes/       # Route handlers & validation
  ├── services/     # Core business logic
  │   ├── llm/     # AI & function handlers
  │   ├── project/ # Project & file management
  │   ├── memory/  # State & history tracking
  │   └── context/ # Vector search & embeddings
  ├── schemas/     # Type definitions & validation
  └── utils/       # Shared utilities
```

## Documentation

- [Codebase Index](./codebase-index.md) - Detailed code structure
- [Contributing Guide](./CONTRIBUTING.md) - Development guidelines
- [API Reference](./docs/api.md) - Full API documentation
- [Security](./SECURITY.md) - Security practices & reporting

## License

MIT License - see [LICENSE](LICENSE)

## Output Validation

The API now includes JSON schema validation for all LLM outputs to ensure deterministic and well-formed responses. Key features:

### Schemas

- `code.schema.json`: Validates code generation output
- `function.schema.json`: Validates function call responses
- `imageAnalysis.schema.json`: Validates image analysis results

### Usage

```typescript
import { validateLLMResponse } from './utils/prompts/validation';

// Validate LLM response against schema
const result = await validateLLMResponse(llmOutput, 'code');

// Automatic retries on invalid output
const result = await validateWithRetry('code', generateCode);

// Validation telemetry
await telemetry.flush(); // View validation stats
```

### Error Handling

- Validation errors include detailed path information
- Automatic retry logic for invalid outputs
- Telemetry tracking for validation success/failure rates

### Adding New Schemas

1. Add schema file in `src/schemas/`
2. Update prompt templates in `src/utils/prompts/`
3. Add types and validation tests
4. Update telemetry tracking

See documentation for more details.
