/** @typedef {import('../types/intent').IntentMode} IntentMode */

/** @type {Record<string, { model: string, promptTemplate: string, systemMessage: string }>} */
const roocodeModes = {
  scaffold: {
    model: 'code-davinci-002',
    systemMessage: `You are an expert software architect with deep knowledge of project structures and best practices.
Focus on creating well-organized, maintainable project scaffolds that follow industry standards.
Always return output in a tree structure using ├── and └── prefixes.`,
    promptTemplate: `Here are examples of project scaffolds:

Example 1:
Input: "Create a TypeScript Express API project"
Output:
├── src/
│   ├── config/
│   │   └── env.ts
│   ├── controllers/
│   │   └── index.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── error.ts
│   ├── routes/
│   │   └── api.ts
│   ├── services/
│   │   └── index.ts
│   └── app.ts
├── tests/
│   └── api.test.ts
├── package.json
└── tsconfig.json

Now, please create a project scaffold for:
{{prompt}}`
  },

  refactor: {
    model: 'code-davinci-002',
    systemMessage: `You are a code refactoring expert specializing in clean code principles and design patterns.
Focus on improving code quality, readability, and maintainability.
Always return solutions in unified diff format.`,
    promptTemplate: `Let's think about this refactoring step by step:
1. Analyze the current code structure
2. Identify code smells and patterns
3. Apply appropriate design patterns
4. Ensure backward compatibility
5. Add proper error handling

Here's a similar example:
Input: "Convert to TypeScript and add error handling"
Code:
function fetchUser(id) {
  return db.users.findOne(id);
}

Output:
diff --git a/src/users.ts b/src/users.ts
--- a/src/users.ts
+++ b/src/users.ts
@@ -1,3 +1,15 @@
-function fetchUser(id) {
-  return db.users.findOne(id);
+interface User {
+  id: string;
+  name: string;
+}
+
+async function fetchUser(id: string): Promise<User> {
+  try {
+    const user = await db.users.findOne(id);
+    if (!user) {
+      throw new Error(\`User not found: \${id}\`);
+    }
+    return user;
+  } catch (err) {
+    throw new Error(\`Failed to fetch user: \${err.message}\`);
+  }
 }

Now, let's refactor this code:
{{code}}

Here's the refactored solution:`,
  },

  testgen: {
    model: 'code-davinci-002',
    systemMessage: `You are a testing expert specializing in Jest and testing best practices.
Focus on comprehensive test coverage including edge cases and error scenarios.
Always return valid Jest test files with describe/it blocks.`,
    promptTemplate: `Here are examples of test generation:

Example 1:
Input: "Test an authentication middleware"
Code:
export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

Output:
import { describe, it, expect, jest } from '@jest/globals';
import { authMiddleware } from './auth';

describe('authMiddleware', () => {
  it('should return 401 if no token provided', () => {
    const req = { headers: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'No token' });
    expect(next).not.toHaveBeenCalled();
  });
});

Now, let's generate tests for:
{{code}}`,
  },

  cicd: {
    model: 'code-davinci-002',
    systemMessage: `You are a security-focused CI/CD architect specializing in automated workflows.
Focus on secure, efficient pipelines with proper access controls and secret management.
Always return valid YAML configuration files.`,
    promptTemplate: `Here are examples of CI/CD configurations:

Example 1:
Input: "Create a Node.js build and test workflow"
Output:
name: Node.js CI/CD
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
        env:
          NODE_ENV: test

Now, please create a CI/CD workflow for:
{{prompt}}`,
  },

  docgen: {
    model: 'code-davinci-002',
    systemMessage: `You are a technical documentation expert specializing in clear, comprehensive documentation.
Focus on user-friendly explanations with proper structure and examples.
Always return Markdown with proper heading hierarchy (#, ##, ###).`,
    promptTemplate: `Here are examples of documentation:

Example 1:
Input: "Document a user authentication API"
Output:
# User Authentication API

## POST /api/auth/login

Authenticates a user and returns a JWT token.

### Request Body

| Field    | Type   | Required | Description     |
|----------|--------|----------|-----------------|
| email    | string | Yes      | User's email    |
| password | string | Yes      | User's password |

### Response

#### Success (200 OK)

\`\`\`json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "123",
    "email": "user@example.com"
  }
}
\`\`\`

Now, please generate documentation for:
{{prompt}}`
  }
};

module.exports = roocodeModes;
