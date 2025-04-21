import { validate } from '../validator';

export async function validateLLMResponse<T>(
  response: string,
  schemaName: string
): Promise<T> {
  try {
    const parsed = JSON.parse(response.trim());
    return await validate<T>(schemaName, parsed);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in LLM response: ${error.message}`);
    }
    throw error;
  }
}
