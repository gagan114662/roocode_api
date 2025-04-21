import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { openai, chatWithImages, chatWithFunctions, chatWithAll } from '../openaiProvider';
import fs from 'fs/promises';
import path from 'path';

jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }))
}));

describe('OpenAI Provider', () => {
  const mockImage = {
    name: 'test.jpg',
    data: Buffer.from('test image data')
  };

  const mockResponse = {
    id: 'response-1',
    choices: [{
      message: {
        role: 'assistant',
        content: 'Test response'
      }
    }],
    usage: {
      total_tokens: 100
    },
    model: 'gpt-4-vision-preview'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (openai.chat.completions.create as jest.Mock).mockResolvedValue(mockResponse);
  });

  describe('chatWithImages', () => {
    it('processes images with base64 data', async () => {
      const messages = [{ role: 'user', content: 'Analyze this image' }];
      
      const result = await chatWithImages(messages, [mockImage]);

      expect(openai.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: 'image_url',
                  image_url: expect.objectContaining({
                    url: expect.stringContaining('base64')
                  })
                })
              ])
            })
          ])
        })
      );
      expect(result.message).toBe(mockResponse.choices[0].message);
    });

    it('processes images with URLs', async () => {
      const messages = [{ role: 'user', content: 'Analyze this image' }];
      const imageUrl = 'https://example.com/test.jpg';
      
      const result = await chatWithImages(messages, [{
        name: 'test.jpg',
        url: imageUrl
      }]);

      expect(openai.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: 'image_url',
                  image_url: imageUrl
                })
              ])
            })
          ])
        })
      );
    });
  });

  describe('chatWithAll', () => {
    const mockFunctionResponse = {
      ...mockResponse,
      choices: [{
        message: {
          role: 'assistant',
          function_call: {
            name: 'testFunction',
            arguments: '{"arg": "value"}'
          }
        }
      }]
    };

    it('combines image and function analysis', async () => {
      (openai.chat.completions.create as jest.Mock)
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockFunctionResponse);

      const messages = [{ role: 'user', content: 'Analyze and act on this image' }];
      const functions = [{
        name: 'testFunction',
        description: 'Test function',
        parameters: {
          type: 'object',
          properties: {
            arg: { type: 'string' }
          }
        }
      }];

      const result = await chatWithAll(messages, [mockImage], { functions });

      // Should have called create twice - once for vision, once for function
      expect(openai.chat.completions.create).toHaveBeenCalledTimes(2);
      
      // Should include both stages in result
      expect(result.stages).toEqual({
        imageAnalysis: expect.objectContaining({
          message: mockResponse.choices[0].message
        }),
        functionCalls: expect.objectContaining({
          message: mockFunctionResponse.choices[0].message
        })
      });
    });

    it('skips function calls when not provided', async () => {
      const messages = [{ role: 'user', content: 'Just analyze this image' }];
      
      const result = await chatWithAll(messages, [mockImage]);

      expect(openai.chat.completions.create).toHaveBeenCalledTimes(1);
      expect(result.stages).toBeUndefined();
    });

    it('handles errors gracefully', async () => {
      (openai.chat.completions.create as jest.Mock)
        .mockRejectedValueOnce(new Error('Vision API error'));

      const messages = [{ role: 'user', content: 'Analyze this image' }];
      
      await expect(chatWithAll(messages, [mockImage]))
        .rejects.toThrow('Vision API error');
    });
  });

  describe('configuration', () => {
    it('respects custom model settings', async () => {
      const customModel = 'custom-vision-model';
      
      await chatWithImages([], [mockImage], { model: customModel });

      expect(openai.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({ model: customModel })
      );
    });

    it('respects response_id for threading', async () => {
      const responseId = 'prev-response';
      
      await chatWithImages([], [mockImage], { response_id: responseId });

      expect(openai.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({ response_id: responseId })
      );
    });

    it('applies default configurations', async () => {
      await chatWithImages([], [mockImage]);

      expect(openai.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(String),
          temperature: 0,
          max_tokens: expect.any(Number)
        })
      );
    });
  });
});
