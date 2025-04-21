export type ProviderType = 
  | 'anthropic'
  | 'openai'
  | 'ollama'
  | 'openrouter'
  | 'bedrock'
  | 'vertex'
  | 'gemini'
  | 'openai-native'
  | 'mistral'
  | 'deepseek'
  | 'glama'
  | 'unbound'
  | 'requesty'
  | 'lmstudio'
  | 'vscode-lm'
  | 'xai'
  | 'human-relay';

export interface ProviderConfig {
  type: ProviderType;
  apiKey?: string;
  organizationId?: string;
  baseUrl?: string;
  defaultModel?: string;
}

export interface ProviderCapabilities {
  supportsStreaming: boolean;
  supportsFunctionCalling: boolean;
  supportsVision: boolean;
  maxTokens: number;
}

export const providerCapabilities: Record<ProviderType, ProviderCapabilities> = {
  anthropic: {
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: false,
    maxTokens: 100000
  },
  openai: {
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: true,
    maxTokens: 128000
  },
  ollama: {
    supportsStreaming: true,
    supportsFunctionCalling: false,
    supportsVision: false,
    maxTokens: 32000
  },
  openrouter: {
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: true,
    maxTokens: 128000
  },
  bedrock: {
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: false,
    maxTokens: 100000
  },
  vertex: {
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: true,
    maxTokens: 128000
  },
  gemini: {
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: true,
    maxTokens: 128000
  },
  'openai-native': {
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: true,
    maxTokens: 128000
  },
  mistral: {
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: false,
    maxTokens: 32000
  },
  deepseek: {
    supportsStreaming: true,
    supportsFunctionCalling: false,
    supportsVision: false,
    maxTokens: 32000
  },
  glama: {
    supportsStreaming: true,
    supportsFunctionCalling: false,
    supportsVision: true,
    maxTokens: 32000
  },
  unbound: {
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: false,
    maxTokens: 32000
  },
  requesty: {
    supportsStreaming: false,
    supportsFunctionCalling: false,
    supportsVision: false,
    maxTokens: 32000
  },
  lmstudio: {
    supportsStreaming: true,
    supportsFunctionCalling: false,
    supportsVision: false,
    maxTokens: 32000
  },
  'vscode-lm': {
    supportsStreaming: true,
    supportsFunctionCalling: false,
    supportsVision: false,
    maxTokens: 32000
  },
  xai: {
    supportsStreaming: true,
    supportsFunctionCalling: false,
    supportsVision: false,
    maxTokens: 32000
  },
  'human-relay': {
    supportsStreaming: false,
    supportsFunctionCalling: false,
    supportsVision: false,
    maxTokens: 32000
  }
};

export function isStreamingProvider(type: ProviderType): boolean {
  return providerCapabilities[type].supportsStreaming;
}

export function supportsFunctionCalling(type: ProviderType): boolean {
  return providerCapabilities[type].supportsFunctionCalling;
}

export function supportsVision(type: ProviderType): boolean {
  return providerCapabilities[type].supportsVision;
}

export function getMaxTokens(type: ProviderType): number {
  return providerCapabilities[type].maxTokens;
}