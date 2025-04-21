import { ProviderType } from './providers';

export interface ApiConfigurationOptions {
  apiProvider: ProviderType;
  apiKey?: string;
  organizationId?: string;
  baseUrl?: string;
}

export interface AppConfiguration {
  api: ApiConfigurationOptions;
  ui: {
    theme: 'light' | 'dark' | 'system';
    fontSize: number;
  };
  editor: {
    indentSize: number;
    wrapLines: boolean;
  };
  features: {
    autoSave: boolean;
    autoFormat: boolean;
    suggestions: boolean;
  };
}

export const DEFAULT_CONFIGURATION: AppConfiguration = {
  api: {
    apiProvider: 'openai',
    apiKey: undefined,
    organizationId: undefined,
    baseUrl: undefined
  },
  ui: {
    theme: 'system',
    fontSize: 14
  },
  editor: {
    indentSize: 2,
    wrapLines: true
  },
  features: {
    autoSave: true,
    autoFormat: true,
    suggestions: true
  }
};