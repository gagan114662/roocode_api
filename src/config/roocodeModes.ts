/** @typedef {import('../types/intent').IntentMode} IntentMode */

/** @type {Record<string, { model: string, promptTemplate: string }>} */
const roocodeModes = {
  code: {
    model: 'code-davinci-002',
    promptTemplate: `
      // You are an expert software engineer. Write clean, maintainable, and well-documented code.
      // Format your response as a complete, self-contained source file with imports and exports.
      // Example Output:
      // import { Router } from 'express';
      // export const router = Router();
      // ...

      {{prompt}}
    `,
    systemMessage: 'You are a coding expert who writes production-quality code following best practices.'
  },

  debug: {
    model: 'code-davinci-002',
    promptTemplate: `
      // You are a debugging expert. Analyze the code and error, then provide a unified diff format fix.
      // Your response must start with "diff --git" and follow unified diff format.
      
      Code:
      {{code}}

      Error:
      {{error}}
    `,
    systemMessage: 'You are a debugging expert who provides precise unified diff patches.'
  },

  dependencyUpdate: {
    model: 'o4-mini',
    promptTemplate: `You are the Dependency Update agent. Given this package.json, output a unified diff that bumps each dependency to the latest semver-compatible version.

\`\`\`json
{{packageJson}}
\`\`\`
    `,
    systemMessage: 'You are a dependency management expert who safely updates project dependencies.'
  }
};

module.exports = roocodeModes;
