/** @typedef {import('../types/intent').IntentMode} IntentMode */

/** @type {Record<string, { model: string, promptTemplate: string }>} */
const roocodeModes = {
  DependencyUpdate: {
    model: 'o4-mini',
    promptTemplate: `You are the Dependency Update agent. Given this package.json, output a unified diff that bumps each dependency to the latest semver-compatible version.

\`\`\`json
{{packageJson}}
\`\`\`
    `
  },
  Code: {
    model: 'o4-mini',
    promptTemplate: `
      // EXAMPLE:
      // Input: "Implement GET /health"
      // Output:
      // router.get('/health', (_req, res) => res.send({ ok: true }));
      
      You are the Code agent. Write clean, well-tested production code following best practices.

      {{prompt}}
    `
  },
  Debug: {
    model: 'o4-mini',
    promptTemplate: `
      You are the Debug agent. Analyze the code and error, then provide a unified diff format fix.

      Code:
      {{code}}

      Error:
      {{error}}
    `
  }
};

module.exports = roocodeModes;
