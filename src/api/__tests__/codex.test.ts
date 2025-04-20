import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { openai, codexTokensUsed } from '../providers/openaiProvider';
import app from '../index';
import request from 'supertest';

jest.mock('../providers/openaiProvider');

describe('Codex Model Integration', () => {
    const mockProjectId = 'test-project';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Code Mode', () => {
        it('should return complete file content with imports and exports', async () => {
            const mockResponse = `
import express from 'express';
import { Router } from 'express';

export const router = Router();

router.get('/test', (req, res) => {
    res.json({ status: 'ok' });
});

export default router;`;

            (openai.createCompletion as jest.Mock).mockResolvedValue({
                data: {
                    choices: [{ text: mockResponse }],
                    usage: { total_tokens: 150 }
                }
            });

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
            expect(codexTokensUsed.inc).toHaveBeenCalledWith({ mode: 'completion' }, 150);
        });

        it('should handle large file generation (>200 lines)', async () => {
            const largeMockResponse = `
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) {}

    ${Array(200).fill(`
    async testMethod() {
        return this.userRepository.find();
    }`).join('\n')}
}`;
            
            (openai.createCompletion as jest.Mock).mockResolvedValue({
                data: {
                    choices: [{ text: largeMockResponse }],
                    usage: { total_tokens: 1500 }
                }
            });

            const response = await request(app)
                .post(`/projects/${mockProjectId}/execute`)
                .send({
                    prompt: 'Create a large NestJS service class',
                    mode: 'code'
                })
                .expect(200);

            expect(response.body.data.output.split('\n').length).toBeGreaterThan(200);
            expect(openai.createCompletion).toHaveBeenCalledWith(
                expect.objectContaining({
                    max_tokens: 2048
                })
            );
            expect(codexTokensUsed.inc).toHaveBeenCalledWith({ mode: 'completion' }, 1500);
        });
    });

    describe('Debug Mode', () => {
        it('should return unified diff format with single file', async () => {
            const mockDiff = `diff --git a/src/index.ts b/src/index.ts
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,5 +1,5 @@
 function processData(data) {
-    return data.map(x => x.value);
+    return data?.map(x => x?.value) || [];
}`;

            (openai.createCompletion as jest.Mock).mockResolvedValue({
                data: {
                    choices: [{ text: mockDiff }],
                    usage: { total_tokens: 100 }
                }
            });

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
            expect(codexTokensUsed.inc).toHaveBeenCalledWith({ mode: 'completion' }, 100);
        });

        it('should handle multi-file diffs', async () => {
            const mockMultiDiff = `diff --git a/src/service.ts b/src/service.ts
--- a/src/service.ts
+++ b/src/service.ts
@@ -1,5 +1,5 @@
 class UserService {
-    async getUser(id) {
+    async getUser(id: string) {
         return this.db.users.findOne(id);
     }
 }
diff --git a/src/types.ts b/src/types.ts
--- a/src/types.ts
+++ b/src/types.ts
@@ -1,3 +1,7 @@
+export interface User {
+    id: string;
+    name: string;
+}
 export type UserId = string;`;

            (openai.createCompletion as jest.Mock).mockResolvedValue({
                data: {
                    choices: [{ text: mockMultiDiff }],
                    usage: { total_tokens: 200 }
                }
            });

            const response = await request(app)
                .post(`/projects/${mockProjectId}/execute`)
                .send({
                    code: ['service.ts', 'types.ts'],
                    error: 'Type safety improvements needed',
                    mode: 'debug'
                })
                .expect(200);

            expect(response.body.data.output).toMatch(/diff --git.*service\.ts/);
            expect(response.body.data.output).toMatch(/diff --git.*types\.ts/);
            expect(response.body.data.output).toMatch(/\+export interface User/);
            expect(codexTokensUsed.inc).toHaveBeenCalledWith({ mode: 'completion' }, 200);
        });
    });
});
