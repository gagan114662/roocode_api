import { FunctionDefinition } from 'openai/resources/chat/completions';

/**
 * Built-in functions available to LLM agents.
 */
export const BUILT_IN_FUNCTIONS: FunctionDefinition[] = [
  {
    name: 'runTests',
    description: 'Run the test suite for a project',
    parameters: {
      type: 'object',
      properties: {
        projectId: { 
          type: 'string', 
          description: 'ID of the project to test' 
        },
        testPattern: { 
          type: 'string', 
          description: 'Optional grep pattern to filter tests' 
        },
        updateSnapshots: {
          type: 'boolean',
          description: 'Whether to update test snapshots',
          default: false
        }
      },
      required: ['projectId']
    }
  },
  {
    name: 'getFileContent',
    description: 'Retrieve the contents of a file in the workspace',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        filePath: { type: 'string' }
      },
      required: ['projectId', 'filePath']
    }
  },
  {
    name: 'writeFile',
    description: 'Write content to a file in the workspace',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        filePath: { type: 'string' },
        content: { type: 'string' },
        createDirs: {
          type: 'boolean',
          description: 'Create parent directories if they don\'t exist',
          default: true
        }
      },
      required: ['projectId', 'filePath', 'content']
    }
  },
  {
    name: 'commitChanges',
    description: 'Commit changes to version control',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        message: { type: 'string' },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of files to commit'
        }
      },
      required: ['projectId', 'message', 'files']
    }
  },
  {
    name: 'searchCode',
    description: 'Search through project codebase',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        query: { type: 'string' },
        topK: {
          type: 'number',
          description: 'Number of results to return',
          default: 5
        }
      },
      required: ['projectId', 'query']
    }
  },
  {
    name: 'readMemory',
    description: 'Read from project memory sections',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        section: {
          type: 'string',
          enum: ['productContext', 'decisionLog', 'implementationNotes', 'ciIssues', 'testCoverage']
        }
      },
      required: ['projectId', 'section']
    }
  },
  {
    name: 'writeMemory',
    description: 'Append to project memory sections',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        section: {
          type: 'string',
          enum: ['productContext', 'decisionLog', 'implementationNotes', 'ciIssues', 'testCoverage']
        },
        entry: { type: 'string' }
      },
      required: ['projectId', 'section', 'entry']
    }
  }
];

/**
 * Function implementers for handling LLM function calls.
 */
export interface FunctionImplementer {
  runTests(args: any): Promise<any>;
  getFileContent(args: any): Promise<any>;
  writeFile(args: any): Promise<any>;
  commitChanges(args: any): Promise<any>;
  searchCode(args: any): Promise<any>;
  readMemory(args: any): Promise<any>;
  writeMemory(args: any): Promise<any>;
}

/**
 * Helper to extract function names from definitions.
 */
export const FUNCTION_NAMES = BUILT_IN_FUNCTIONS.map(f => f.name);

/**
 * Validates function arguments against their schema.
 */
export function validateFunctionArgs(
  name: string,
  args: Record<string, any>
): string[] {
  const func = BUILT_IN_FUNCTIONS.find(f => f.name === name);
  if (!func) return [`Unknown function: ${name}`];

  const errors: string[] = [];
  const schema = func.parameters;

  // Check required fields
  for (const required of schema.required || []) {
    if (!(required in args)) {
      errors.push(`Missing required argument: ${required}`);
    }
  }

  // Validate types and enums
  Object.entries(args).forEach(([key, value]) => {
    const prop = schema.properties[key];
    if (!prop) {
      errors.push(`Unknown argument: ${key}`);
      return;
    }

    if (prop.type === 'array' && !Array.isArray(value)) {
      errors.push(`${key} must be an array`);
    }
    if (prop.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`${key} must be a boolean`);
    }
    if (prop.type === 'number' && typeof value !== 'number') {
      errors.push(`${key} must be a number`);
    }
    if (prop.enum && !prop.enum.includes(value)) {
      errors.push(`${key} must be one of: ${prop.enum.join(', ')}`);
    }
  });

  return errors;
}

export default {
  BUILT_IN_FUNCTIONS,
  FUNCTION_NAMES,
  validateFunctionArgs
};
