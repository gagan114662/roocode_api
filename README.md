# RooCode API

RooCode is an AI-powered code generation and maintenance API that helps developers automate routine coding tasks.

## Prerequisites

- Node.js >= 18
- Redis for job queue
- prom-client for metrics (`npm install prom-client`)
- bullmq for job queue (`npm install bullmq`)
- OpenAI API key for LLM features

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Required variables:
- `OPENAI_API_KEY`: Your OpenAI API key
- `REDIS_URL`: Redis connection URL
- `WORKSPACE_PATH`: Path to store project workspaces

3. Start Redis:
```bash
docker run -d -p 6379:6379 redis:alpine
```

4. Run the API:
```bash
npm run start:api
```

## Features

### Hierarchical Project Planning

RooCode can generate and execute hierarchical project plans with parent-child task relationships:

1. Generate a plan:
```bash
curl -X POST http://localhost:3000/projects/:id/plan \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create a user authentication system"}'
```

2. Execute a plan (asynchronously):
```bash
curl -X POST http://localhost:3000/projects/:id/execute-plan/:planId
```

3. Monitor execution progress:
```bash
curl http://localhost:3000/projects/:id/execute-plan/:planId/history
```

4. Cancel plan execution:
```bash
curl -X DELETE http://localhost:3000/projects/:id/execute-plan/:planId
```

Key capabilities:
- Hierarchical task structure with parent-child relationships
- Depth-first execution of tasks
- Asynchronous execution with job queue
- Execution history tracking
- Task cancellation with cleanup
- Timeout handling for long-running tasks

### Dependency Updates

The API can automatically update project dependencies using AI assistance:

```bash
curl -X POST http://localhost:3000/projects/:id/update-deps
```

Monitor the job status:
```bash
curl http://localhost:3000/projects/:id/update-deps/:jobId
```

### Metrics

Prometheus metrics are available at `/metrics`. Key metrics include:
- Job queue statistics (enqueued, completed, failed)
- Plan execution metrics (started, completed, failed, cancelled)
- Task execution metrics (by owner mode, status)
- Execution durations (histograms for plans and tasks)
- Dependency update success rates
- API latencies

Health check endpoint with basic metrics:
```bash
curl http://localhost:3000/health
```

## Observability

RooCode provides comprehensive observability features:

1. Execution History
   - Detailed task execution history with timestamps
   - Success/failure status for each task
   - Execution duration tracking
   - Error messages for failed tasks

2. Prometheus Metrics
   - Counter metrics for execution events
   - Histogram metrics for execution durations
   - Labels for filtering by project, task type, and status

3. Error Handling
   - Standardized error responses with error codes
   - Detailed error messages for debugging
   - Proper HTTP status codes

## Development

Run tests:
```bash
npm run test:services        # Run service tests
npm run test:api            # Run API tests
npm run test:services:watch # Watch mode
```

## Contributing

1. Create a feature branch
2. Make changes and add tests
3. Run all tests
4. Submit a pull request

## License

MIT
