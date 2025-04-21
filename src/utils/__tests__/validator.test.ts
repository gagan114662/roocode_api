import { validate, validateWithRetry, ValidationError } from '../validator';
import fs from 'fs/promises';
import path from 'path';

jest.mock('fs/promises');

describe('Validator', () => {
  beforeEach(() => {
    // Mock schema file read
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({
      type: 'object',
      required: ['id', 'name'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' }
      }
    }));
  });

  describe('validate', () => {
    it('validates correct data', async () => {
      const data = { id: '123', name: 'test' };
      const result = await validate('test', data);
      expect(result).toEqual(data);
    });

    it('throws ValidationError for invalid data', async () => {
      const data = { id: 123, name: 'test' };
      await expect(validate('test', data)).rejects.toThrow(ValidationError);
    });
  });

  describe('validateWithRetry', () => {
    it('retries until valid data is generated', async () => {
      const generator = jest.fn()
        .mockRejectedValueOnce(new Error('Invalid JSON'))
        .mockResolvedValueOnce({ id: 'valid', name: 'test' });

      const result = await validateWithRetry('test', generator);
      expect(result).toEqual({ id: 'valid', name: 'test' });
      expect(generator).toHaveBeenCalledTimes(2);
    });

    it('throws after max retries', async () => {
      const generator = jest.fn()
        .mockRejectedValue(new Error('Always invalid'));

      await expect(validateWithRetry('test', generator, 2))
        .rejects
        .toThrow('Failed to generate valid output after 2 attempts');
    });
  });
});
