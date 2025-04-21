import { ApiHandlerOptions } from '../../shared/api';
import { ProviderSettings } from '../../schemas';
import { SingleCompletionHandler } from '..';
import { AnthropicHandler } from './anthropic';
import { GlamaHandler } from './glama';
import { OpenRouterHandler } from './openrouter';
import { AwsBedrockHandler } from './bedrock';
import { VertexHandler } from './vertex';
import { OpenAiHandler } from './openai';
import { OllamaHandler } from './ollama';
import { LmStudioHandler } from './lmstudio';
import { GeminiHandler } from './gemini';
import { OpenAiNativeHandler } from './openai-native';
import { MistralHandler } from './mistral';
import { UnboundHandler } from './unbound';
import { XAIHandler } from './xai';

export function buildApiHandler(options: ProviderSettings): SingleCompletionHandler {
    const provider = options.apiProvider || 'openrouter';

    // Convert options to ApiHandlerOptions by omitting apiProvider and id
    const handlerOptions: ApiHandlerOptions = { ...options };
    delete (handlerOptions as any).apiProvider;
    delete (handlerOptions as any).id;

    switch (provider) {
        case 'anthropic':
            return new AnthropicHandler(handlerOptions);
        case 'glama':
            return new GlamaHandler(handlerOptions);
        case 'openrouter':
            return new OpenRouterHandler(handlerOptions);
        case 'bedrock':
            return new AwsBedrockHandler(options); // Bedrock needs full ProviderSettings
        case 'vertex':
            return new VertexHandler(handlerOptions);
        case 'openai':
            return new OpenAiHandler(handlerOptions);
        case 'ollama':
            return new OllamaHandler(handlerOptions);
        case 'lmstudio':
            return new LmStudioHandler(handlerOptions);
        case 'gemini':
            return new GeminiHandler(handlerOptions);
        case 'openai-native':
            return new OpenAiNativeHandler(handlerOptions);
        case 'mistral':
            return new MistralHandler(handlerOptions);
        case 'unbound':
            return new UnboundHandler(handlerOptions);
        case 'xai':
            return new XAIHandler(handlerOptions);
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}

export { BaseProvider } from './base-provider';
export type { SingleCompletionHandler };