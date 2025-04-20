/** @typedef {import('../types/intent').IntentMode} IntentMode */

const roocodeModes = {
  scaffold: {
    model: 'code-davinci-002',
    systemMessage: 'You are an expert software architect. Return project scaffolds using tree structure with ├── and └── prefixes.',
    promptTemplate: `Here's an example scaffold:
Input: "Create a TypeScript Express API"
Output:
├── src/
│   ├── controllers/
│   │   └── index.ts
│   ├── routes/
│   │   └── api.ts
│   └── app.ts
└── package.json

Now create a scaffold for: {{prompt}}`
  },

  refactor: {
    model: 'code-davinci-002',
    systemMessage: 'You are a code refactoring expert. Always return solutions in unified diff format.',
    promptTemplate: `Let's think step by step:
1. Analyze code structure
2. Identify improvements
3. Apply patterns
4. Add error handling

Example:
Input: Convert to async/await
Code: function getData() { return fetch(url); }
Output: 
diff --git a/src/api.ts b/src/api.ts
--- a/src/api.ts
+++ b/src/api.ts
@@ -1,1 +1,7 @@
-function getData() { return fetch(url); }
+async function getData() {
+  try {
+    return await fetch(url);
+  } catch (err) {
+    throw new Error(\`Failed to fetch data: \${err.message}\`);
+  }
+}

Now refactor: {{code}}`
  },

  testgen: {
    model: 'code-davinci-002',
    systemMessage: 'You are a testing expert. Always return valid Jest tests with describe/it blocks.',
    promptTemplate: `Example test:
describe('sum', () => {
  it('adds numbers correctly', () => {
    expect(sum(1, 2)).toBe(3);
  });
});

Generate tests for: {{code}}`
  },

  cicd: {
    model: 'code-davinci-002', 
    systemMessage: 'You are a CI/CD expert. Return valid GitHub Actions YAML config.',
    promptTemplate: `Example workflow:
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test

Create workflow for: {{prompt}}`
  },

  docgen: {
    model: 'code-davinci-002',
    systemMessage: 'You are a documentation expert. Return Markdown with proper heading hierarchy.',
    promptTemplate: `Example docs:
# API Endpoint
## POST /users
Creates a new user.
### Request
\`\`\`json
{ "name": "string" }
\`\`\`

Document: {{prompt}}`
  }
};

module.exports = roocodeModes;
