import OpenAI from 'openai';
import { ChatMessage } from './types';
import { ChatCompletionCreateParamsBase } from 'openai/resources/chat/completions';

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID
});

export interface ChatImage {
  name: string;
  path?: string;
  url?: string;
  data?: Buffer | string;
}

export interface ChatOptions extends Partial<ChatCompletionCreateParamsBase> {
  response_id?: string;
  functions?: any[];
  function_call?: 'auto' | 'none' | { name: string };
}

/**
 * Enhanced chat completion with function calling support
 */
export async function chatWithFunctions(
  messages: ChatMessage[],
  options: ChatOptions = {}
) {
  const defaultModel = process.env.OPENAI_CHAT_MODEL || 'gpt-4-turbo-preview';
  
  const response = await openai.chat.completions.create({
    model: options.model || defaultModel,
    messages,
    functions: options.functions,
    function_call: options.function_call || 'auto',
    temperature: options.temperature ?? 0,
    max_tokens: options.max_tokens,
    response_id: options.response_id
  });

  return {
    id: response.id,
    message: response.choices[0].message,
    usage: response.usage,
    model: response.model
  };
}

/**
 * Chat completion with image support
 */
export async function chatWithImages(
  messages: ChatMessage[],
  images: ChatImage[] = [],
  options: ChatOptions = {}
) {
  const defaultModel = process.env.OPENAI_VISION_MODEL || 'gpt-4-vision-preview';

  // Process images into base64 or URLs
  const processedMessages = [...messages];
  for (const image of images) {
    const content: any[] = [{ type: 'text', text: `Image: ${image.name}\n` }];

    if (image.url) {
      content.push({
        type: 'image_url',
        image_url: image.url
      });
    } else if (image.data) {
      const base64Data = Buffer.isBuffer(image.data)
        ? image.data.toString('base64')
        : image.data;
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:image/jpeg;base64,${base64Data}`
        }
      });
    }

    processedMessages.push({
      role: 'user',
      content
    });
  }

  const response = await openai.chat.completions.create({
    model: options.model || defaultModel,
    messages: processedMessages,
    max_tokens: options.max_tokens || 1000,
    temperature: options.temperature ?? 0,
    response_id: options.response_id
  });

  return {
    id: response.id,
    message: response.choices[0].message,
    usage: response.usage,
    model: response.model
  };
}

/**
 * Combined chat with both function and image support
 */
export async function chatWithAll(
  messages: ChatMessage[],
  images: ChatImage[] = [],
  options: ChatOptions = {}
) {
  // Start with processing images
  const imageResponse = await chatWithImages(messages, images, {
    ...options,
    max_tokens: options.max_tokens || 500
  });

  // Then allow function calls based on image understanding
  if (options.functions?.length) {
    const functionResponse = await chatWithFunctions(
      [
        ...messages,
        imageResponse.message,
        {
          role: 'user',
          content: 'Based on the analysis above, what actions should we take?'
        }
      ],
      options
    );

    return {
      id: functionResponse.id,
      message: functionResponse.message,
      usage: {
        ...imageResponse.usage,
        ...functionResponse.usage,
        total_tokens: (imageResponse.usage?.total_tokens || 0) +
          (functionResponse.usage?.total_tokens || 0)
      },
      model: `${imageResponse.model} + ${functionResponse.model}`,
      stages: {
        imageAnalysis: imageResponse,
        functionCalls: functionResponse
      }
    };
  }

  return imageResponse;
}

export default {
  openai,
  chatWithFunctions,
  chatWithImages,
  chatWithAll
};
