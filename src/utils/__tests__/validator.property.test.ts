import fc from 'fast-check';
import { validate, validateWithRetry } from '../validator';
import { telemetry } from '../../services/telemetry/TelemetryService';

// Mock schema for testing
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue(JSON.stringify({
    type: 'object',
    required: ['content', 'language', 'metadata'],
    properties: {
      content: { type: 'string' },
      language: { 
        type: 'string',
        enum: ['typescript', 'javascript', 'python']
      },
      metadata: {
        type: 'object',
        required: ['filename'],
        properties: {
          filename: { type: 'string' }
        }
      }
    }
  }))
}));

describe('Validator Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(telemetry, 'logValidation').mockImplementation();
  });

  describe('validate', () => {
    it('validates correct data structure', async () => {
      // Generate valid test data
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            content: fc.string(),
            language: fc.constantFrom('typescript', 'javascript', 'python'),
            metadata: fc.record({
              filename: fc.string()
            })
          }),
          async (data) => {
            const result = await validate('test', data);
            expect(result).toEqual(data);
          }
        )
      );
    });

    it('rejects invalid data structures', async () => {
      // Test with missing required fields
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            content: fc.string(),
            // Missing language field
            metadata: fc.record({
              filename: fc.string()
            })
          }),
          async (data) => {
            await expect(validate('test', data)).rejects.toThrow();
          }
        )
      );

      // Test with wrong types
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            content: fc.integer(), // Should be string
            language: fc.constantFrom('typescript', 'javascript', 'python'),
            metadata: fc.record({
              filename: fc.string()
            })
          }),
          async (data) => {
            await expect(validate('test', data)).rejects.toThrow();
          }
        )
      );
    });
  });

  describe('validateWithRetry', () => {
    it('retries until valid data is generated', async () => {
      const invalidAttempts = 2;
      let attempts = 0;

      const generateData = () => {
        attempts++;
        if (attempts <= invalidAttempts) {
          return Promise.resolve({ invalid: 'data' });
        }
        return Promise.resolve({
          content: 'valid',
          language: 'typescript',
          metadata: { filename: 'test.ts' }
        });
      };

      const result = await validateWithRetry('test', generateData);
      expect(attempts).toBe(invalidAttempts + 1);
      expect(result.content).toBe('valid');
    });

    it('handles various error types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.oneof(
              fc.constant(new Error('Network error')),
              fc.constant(new SyntaxError('Invalid JSON')),
              fc.constant(new TypeError('Wrong type'))
            ),
            { minLength: 1, maxLength: 3 }
          ),
          async (errors) => {
            let attemptCount = 0;
            const generateData = () => {
              if (attemptCount < errors.length) {
                attemptCount++;
                throw errors[attemptCount - 1];
              }
              return Promise.resolve({
                content: 'valid',
                language: 'typescript',
                metadata: { filename: 'test.ts' }
              });
            };

            if (errors.length >= 3) {
              await expect(validateWithRetry('test', generateData))
                .rejects.toThrow('Failed to generate valid output');
            } else {
              const result = await validateWithRetry('test', generateData);
              expect(result.content).toBe('valid');
            }
          }
        )
      );
    });
  });
});
