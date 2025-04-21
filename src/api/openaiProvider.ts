import OpenAI from 'openai';
import { FunctionDefinition } from 'openai/resources/chat/completions';

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID
});

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'function';
  content?: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

export interface ChatOptions {
  functions?: FunctionDefinition[];
  function_call?: 'auto' | 'none' | { name: string };
  response_id?: string;
  temperature?: number;
  max_tokens?: number;
  model?: string;
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

export default {
  openai,
  chatWithFunctions
};
