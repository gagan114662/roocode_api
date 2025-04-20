import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { openai } from '../providers/openaiProvider';
import app from '../index';
import request from 'supertest';
import * as yaml from 'js-yaml';

jest.mock('../providers/openaiProvider');

describe('Prompt Output Fidelity', () => {
    const mockProjectId = 'test-project';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Scaffold Mode', () => {
        it('should return valid tree structure', async () => {
            const mockResponse = `
├── src/
│   ├── components/
│   │   └── Button.tsx
│   └── index.ts
└── package.json`;

            (openai.createCompletion as jest.Mock).mockResolvedValue({
                data: {
                    choices: [{ text: mockResponse }]
                }
            });

            const response = await request(app)
                .post(`/projects/${mockProjectId}/execute`)
                .send({
                    prompt: 'Create a React component',
                    mode: 'scaffold'
                })
                .expect(200);

            expect(response.body.data.output).toMatch(/^├── /m);
            expect(response.body.data.output).toMatch(/│   /);
            expect(response.body.data.output).toMatch(/└── /);
        });
    });

    describe('Refactor Mode', () => {
        it('should return valid unified diff', async () => {
            const mockResponse = `diff --git a/src/component.ts b/src/component.ts
--- a/src/component.ts
+++ b/src/component.ts
@@ -1,1 +1,2 @@
-const Component = props => <div>{props.children}</div>;
+import React from 'react';
+const Component: React.FC = ({ children }) => <div>{children}</div>;`;

            (openai.createCompletion as jest.Mock).mockResolvedValue({
                data: {
                    choices: [{ text: mockResponse }]
                }
            });

            const response = await request(app)
                .post(`/projects/${mockProjectId}/execute`)
                .send({
                    code: 'const Component = props => <div>{props.children}</div>;',
                    mode: 'refactor'
                })
                .expect(200);

            expect(response.body.data.output).toMatch(/^diff --git/);
            expect(response.body.data.output).toMatch(/^--- a\//m);
            expect(response.body.data.output).toMatch(/^\+\+\+ b\//m);
            expect(response.body.data.output).toMatch(/^[-+]/m);
        });
    });

    describe('TestGen Mode', () => {
        it('should return valid Jest test file', async () => {
            const mockResponse = `
import { describe, it, expect } from '@jest/globals';
import { sum } from './math';

describe('sum', () => {
    it('should add two numbers correctly', () => {
        expect(sum(1, 2)).toBe(3);
    });
});`;

            (openai.createCompletion as jest.Mock).mockResolvedValue({
                data: {
                    choices: [{ text: mockResponse }]
                }
            });

            const response = await request(app)
                .post(`/projects/${mockProjectId}/execute`)
                .send({
                    code: 'export const sum = (a, b) => a + b;',
                    mode: 'testgen'
                })
                .expect(200);

            expect(response.body.data.output).toMatch(/describe\(['"]/);
            expect(response.body.data.output).toMatch(/it\(['"]/);
            expect(response.body.data.output).toMatch(/expect\(/);
        });
    });

    describe('CICD Mode', () => {
        it('should return valid YAML configuration', async () => {
            const mockResponse = `
name: Build and Test
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2`;

            (openai.createCompletion as jest.Mock).mockResolvedValue({
                data: {
                    choices: [{ text: mockResponse }]
                }
            });

            const response = await request(app)
                .post(`/projects/${mockProjectId}/execute`)
                .send({
                    prompt: 'Create a GitHub Actions workflow',
                    mode: 'cicd'
                })
                .expect(200);

            expect(() => yaml.load(response.body.data.output)).not.toThrow();
            const parsed = yaml.load(response.body.data.output) as any;
            expect(parsed).toHaveProperty('name');
            expect(parsed).toHaveProperty('on');
            expect(parsed).toHaveProperty('jobs');
        });
    });

    describe('Chain of Thought Processing', () => {
        it('should strip reasoning blocks from debug output', async () => {
            const mockResponse = `Let's think about this step by step:
1. First check the error type
2. Analyze the code context
3. Consider edge cases

Here's the fix:
diff --git a/src/component.ts b/src/component.ts
--- a/src/component.ts
+++ b/src/component.ts
@@ -1 +1 @@
-const x = a.b.c;
+const x = a?.b?.c;`;

            (openai.createCompletion as jest.Mock).mockResolvedValue({
                data: {
                    choices: [{ text: mockResponse }]
                }
            });

            const response = await request(app)
                .post(`/projects/${mockProjectId}/execute`)
                .send({
                    code: 'const x = a.b.c;',
                    error: 'TypeError: Cannot read property b of undefined',
                    mode: 'debug'
                })
                .expect(200);

            expect(response.body.data.output).not.toMatch(/Let's think about this step by step/);
            expect(response.body.data.output).not.toMatch(/^\d\./m);
            expect(response.body.data.output).toMatch(/^diff --git/m);
        });
    });
});
