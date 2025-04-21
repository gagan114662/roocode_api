import { OpenAIProvider } from '../openaiProvider';
import { ValidationError } from '../../utils/validator';
import fs from 'fs/promises';

jest.mock('openai');
jest.mock('fs/promises');

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    provider = new OpenAIProvider();
    (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('fake-image'));
  });

  describe('chatWithImages', () => {
    it('validates and returns correct image analysis', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                description: 'Test image',
                elements: [{
                  type: 'text',
                  content: 'Sample text',
                  confidence: 0.95
                }]
              })
            }
          }]
        }
      };

      (provider['client'].createChatCompletion as jest.Mock)
        .mockResolvedValue(mockResponse);

      const result = await provider.chatWithImages(
        'Analyze image',
        [{ path: 'test.jpg', type: 'image/jpeg' }]
      );

      expect(result.description).toBe('Test image');
      expect(result.elements).toHaveLength(1);
    });

    it('retries on invalid response', async () => {
      const invalidResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                description: 'Test image'
                // Missing required elements array
              })
            }
          }]
        }
      };

      const validResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                description: 'Test image',
                elements: []
              })
            }
          }]
        }
      };

      (provider['client'].createChatCompletion as jest.Mock)
        .mockResolvedValueOnce(invalidResponse)
        .mockResolvedValueOnce(validResponse);

      const result = await provider.chatWithImages(
        'Analyze image',
        [{ path: 'test.jpg', type: 'image/jpeg' }]
      );

      expect(result.description).toBe('Test image');
      expect(provider['client'].createChatCompletion).toHaveBeenCalledTimes(2);
    });

    it('throws after max retries', async () => {
      const invalidResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                description: 'Test image'
                // Always missing elements
              })
            }
          }]
        }
      };

      (provider['client'].createChatCompletion as jest.Mock)
        .mockResolvedValue(invalidResponse);

      await expect(
        provider.chatWithImages(
          'Analyze image',
          [{ path: 'test.jpg', type: 'image/jpeg' }]
        )
      ).rejects.toThrow('Failed to generate valid output after 3 attempts');
    });
  });
});
