/**
 * RooCode Mode Configuration
 */

import type { Request, Response, NextFunction } from 'express';

export interface ModeConfig {
  model: string;
  promptTemplate: string;
  description?: string;
}

export interface RooModeHandler {
  (req: Request, res: Response, next: NextFunction): Promise<void>;
}

export const modes: Record<string, ModeConfig> = {
  scaffold: {
    model: 'o4-mini',
    description: 'Generate project scaffolding and boilerplate code',
    promptTemplate: `
    You are the Scaffold agent. When given a project description, output only the file structure and basic boilerplate code (package.json, tsconfig.json, src/index.ts, README.md).

    Description: {{description}}
    `
  },

  refactor: {
    model: 'o4-mini',
    description: 'Refactor existing code for better maintainability',
    promptTemplate: `
    You are the Refactor agent. Given existing code, apply best-practice refactorings for readability and maintainability.

    Code Context: {{context}}
    `
  },

  testgen: {
    model: 'o4-mini',
    description: 'Generate unit tests for code',
    promptTemplate: `
    You are the TestGen agent. Generate unit tests for the following code snippet:
    {{code}}
    `
  },

  cicd: {
    model: 'o4-mini',
    description: 'Set up CI/CD pipelines',
    promptTemplate: `
    You are the CICD agent. Create a CI/CD pipeline config (GitHub Actions YAML) that lints, builds, tests, and deploys the project.

    Project: {{description}}
    `
  },

  docgen: {
    model: 'o4-mini',
    description: 'Generate project documentation',
    promptTemplate: `
    You are the DocGen agent. Generate detailed Markdown documentation (README, API docs) for the code in this project.
    
    Code Context: {{context}}
    `
  }
};

// Export mode names for type safety
export type RooMode = keyof typeof modes;
export const modeNames = Object.keys(modes) as RooMode[];

// Function to validate mode name
export function isValidMode(mode: string): mode is RooMode {
  return modeNames.includes(mode as RooMode);
}