/** @typedef {import('../types/intent').IntentMode} IntentMode */

/** @type {Record<string, { model: string, promptTemplate: string, systemMessage: string }>} */
const roocodeModes = {
  code: {
    model: 'code-davinci-002',
    systemMessage: `You are an expert software engineer with deep knowledge of best practices, design patterns, and modern development standards.
Focus on writing clean, maintainable, and well-documented code with proper error handling and type safety.
Always return complete, self-contained source files including all necessary imports and exports.`,
    promptTemplate: `Here are some examples of well-structured code:

Example 1:
Input: "Create an Express middleware for JWT auth"
Output:
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

Example 2:
Input: "Create a Redis cache wrapper"
Output:
import Redis from 'ioredis';
import { promisify } from 'util';

export class CacheService {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }
  
  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }
  
  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } else {
      await this.redis.set(key, JSON.stringify(value));
    }
  }
}

Now, please implement the following:
{{prompt}}`
  },

  debug: {
    model: 'code-davinci-002',
    systemMessage: `You are a debugging expert specializing in identifying and fixing code issues.
Always return solutions in unified diff format, starting with "diff --git".
Consider edge cases, null checks, and type safety in your fixes.
Think through the problem step by step before proposing a solution.`,
    promptTemplate: `Here are examples of bug fixes in unified diff format:

Example 1:
Input:
Code: const getUser = async (id) => { return users.find(u => u.id === id); }
Error: TypeError: Cannot read property 'find' of undefined

Output:
diff --git a/src/users.ts b/src/users.ts
--- a/src/users.ts
+++ b/src/users.ts
@@ -1,3 +1,7 @@
-const getUser = async (id) => { return users.find(u => u.id === id); }
+const getUser = async (id) => { 
+  if (!users || !Array.isArray(users)) {
+    throw new Error('Users database not initialized');
+  }
+  return users.find(u => u.id === id) || null;
+}

Example 2:
Input:
Code: function processItems(items) { return items.map(x => x.value.toString()); }
Error: TypeError: Cannot read properties of undefined (reading 'toString')

Output:
diff --git a/src/processor.ts b/src/processor.ts
--- a/src/processor.ts
+++ b/src/processor.ts
@@ -1 +1,4 @@
-function processItems(items) { return items.map(x => x.value.toString()); }
+function processItems(items = []) {
+  return items
+    .filter(x => x?.value != null)
+    .map(x => x.value.toString());
+}

Now, let's analyze and fix this code:
Code: {{code}}
Error: {{error}}

Let's think about this step by step:
1. First, identify the potential null/undefined values
2. Add appropriate null checks and fallbacks
3. Consider error handling
4. Ensure type safety

Here's the fix:`
  },

  dependencyUpdate: {
    model: 'code-davinci-002',
    systemMessage: 'You are a dependency management expert who safely updates project dependencies while maintaining compatibility.',
    promptTemplate: `You are the Dependency Update agent. Given this package.json, output a unified diff that bumps each dependency to the latest semver-compatible version.
First, analyze the current dependencies and their versions.
Then, check for any potential breaking changes or compatibility issues.
Finally, output a unified diff that updates dependencies safely.

\`\`\`json
{{packageJson}}
\`\`\``
  }
};

module.exports = roocodeModes;
