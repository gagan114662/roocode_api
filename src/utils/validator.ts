import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'fs/promises';
import path from 'path';

const MAX_RETRIES = 3;
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

const validatorCache: Record<string, ValidateFunction> = {};

export async function getValidator(schemaName: string): Promise<ValidateFunction> {
  if (!validatorCache[schemaName]) {
    const schemaPath = path.join(__dirname, '../schemas', `${schemaName}.schema.json`);
    const schema = JSON.parse(await fs.readFile(schemaPath, 'utf-8'));
    validatorCache[schemaName] = ajv.compile(schema);
  }
  return validatorCache[schemaName];
}

export class ValidationError extends Error {
  constructor(
    public readonly schemaName: string,
    public readonly errors: any[],
    public readonly data: unknown
  ) {
    const message = `Validation failed for ${schemaName}: ${errors.map(e => 
      `${e.instancePath} ${e.message}`
    ).join('; ')}`;
    super(message);
    this.name = 'ValidationError';
  }
}

export async function validate<T>(schemaName: string, data: unknown): Promise<T> {
  const validator = await getValidator(schemaName);
  
  if (!validator(data)) {
    throw new ValidationError(schemaName, validator.errors || [], data);
  }
  
  return data as T;
}

export async function validateWithRetry<T>(
  schemaName: string,
  generateData: () => Promise<unknown>,
  maxRetries = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const data = await generateData();
      return await validate<T>(schemaName, data);
    } catch (error) {
      lastError = error as Error;
      console.warn(
        `Validation attempt ${attempt}/${maxRetries} failed:`,
        error instanceof ValidationError ? error.message : error
      );
    }
  }
  
  throw new Error(
    `Failed to generate valid output after ${maxRetries} attempts. Last error: ${lastError?.message}`
  );
}
