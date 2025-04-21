import { CodeGeneration } from '../../types/code';

export const FUNCTION_CALL_SYSTEM_PROMPT = `You are a code generation assistant that outputs valid JSON only.
Your responses must follow these schemas exactly:

For code generation:
{
  "content": "string (the code)",
  "language": "typescript|javascript|python|json|yaml|markdown",
  "metadata": {
    "filename": "string",
    "description": "string",
    "dependencies": ["string (package names)"]
  }
}

For function results:
{
  "success": boolean,
  "result": {
    "output": "string",
    "details": {} (optional)
  },
  "error": {
    "code": "string",
    "message": "string",
    "details": {} (optional)
  }
}

Always validate your output against these schemas before responding.
If you cannot generate valid output, respond with a clear error message.`;

export function generateCodePrompt(params: {
  language?: string;
  description: string;
  context?: string;
}): string {
  return `
Generate code with these requirements:
${params.language ? `Language: ${params.language}` : ''}
Description: ${params.description}
${params.context ? `Context: ${params.context}` : ''}

Respond with JSON matching the code generation schema.
Include tests where appropriate.
`;
}

export function generateFunctionPrompt(params: {
  name: string;
  args: Record<string, any>;
}): string {
  return `
Execute function "${params.name}" with arguments:
${JSON.stringify(params.args, null, 2)}

Respond with JSON matching the function result schema.
Include error details if execution fails.
`;
}
