import Ajv from 'ajv';
import * as fs from 'fs';
import * as path from 'path';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export async function validateWithRetry<T>(
  schemaName: string,
  generateData: () => Promise<unknown>,
  maxRetries = 3
): Promise<T> {
  const schemaPath = path.join(__dirname, '../../schemas', `${schemaName}.schema.json`);
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  const ajv = new Ajv();
  const validate = ajv.compile(schema);

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const data = await generateData();
      if (!validate(data)) {
        throw new ValidationError(ajv.errorsText(validate.errors));
      }
      return data as T;
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) break;
    }
  }
  
  throw new ValidationError(`Failed after ${maxRetries} attempts: ${lastError?.message}`);
}
