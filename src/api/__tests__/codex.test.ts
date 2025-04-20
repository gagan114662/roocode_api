import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { openai } from '../providers/openaiProvider';
import app from '../index';
import request from 'supertest';

jest.mock('../providers/openaiProvider');

describe('Codex Model Integration', () => {
    const mockProjectId = 'test-project';

    describe('Code Mode', () => {
        beforeEach(() => {
            (openai.createCompletion as jest.Mock).mockResolvedValue({
                data: {
                    choices: [{
                        text: `
import express from 'express';
import { Router } from 'express';

export const router = Router();

router.get('/test', (req, res) => {
    res.json({ status: 'ok' });
});

export default router;`
                    }]
                }
            });
        });

        it('should return complete file content with imports and exports', async () => {
            const response = await request(app)
                .post(`/projects/${mockProjectId}/execute`)
                .send({
                    prompt: 'Create a basic Express router',
                    mode: 'code'
                })
                .expect(200);

            expect(response.body.data.output).toMatch(/^import.*express/);
            expect(response.body.data.output).toMatch(/export.*router/);
            expect(openai.createCompletion).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: 'code-davinci-002',
                    temperature: 0
                })
            );
        });
    });

    describe('Debug Mode', () => {
        beforeEach(() => {
            (openai.createCompletion as jest.Mock).mockResolvedValue({
                data: {
                    choices: [{
                        text: `diff --git a/src/index.ts b/src/index.ts
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,5 +1,5 @@
 function processData(data) {
-    return data.map(x => x.value);
+    return data?.map(x => x?.value) || [];
}`
                    }]
                }
            });
        });

        it('should return unified diff format', async () => {
            const response = await request(app)
                .post(`/projects/${mockProjectId}/execute`)
                .send({
                    code: 'function processData(data) { return data.map(x => x.value); }',
                    error: 'TypeError: Cannot read property "map" of undefined',
                    mode: 'debug'
                })
                .expect(200);

            expect(response.body.data.output).toMatch(/^diff --git/);
            expect(response.body.data.output).toMatch(/^--- a\//m);
            expect(response.body.data.output).toMatch(/^\+\+\+ b\//m);
            expect(openai.createCompletion).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: 'code-davinci-002',
                    temperature: 0
                })
            );
        });
    });
});
