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
POST /api/v1/projects/:id/upload-image
GET /api/v1/projects/:id/images
DELETE /api/v1/projects/:id/images/:filename
```

### Memory Operations
```typescript
GET /api/v1/projects/:id/memory/:section
POST /api/v1/projects/:id/memory/:section
```

### Search
```typescript
POST /api/v1/projects/:id/search
{
  query: string;
  limit?: number;
}
```

## Development

### Setup
```bash
npm install
npm run build
```

### Testing
```bash
npm test
npm run test:e2e
```

### Environment Variables
```
OPENAI_API_KEY=
OPENAI_ORG_ID=
OPENAI_CHAT_MODEL=gpt-4-turbo-preview
OPENAI_VISION_MODEL=gpt-4-vision-preview
```

## Architecture

```
src/
  ├── api/          # API layer
  ├── routes/       # Route handlers
  ├── services/     # Core services
  │   ├── llm/     # LLM integration
  │   ├── project/ # Project management
  │   ├── memory/  # State management
  │   └── context/ # Vector search
  ├── schemas/     # Type definitions
  └── utils/       # Shared utilities
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE)
