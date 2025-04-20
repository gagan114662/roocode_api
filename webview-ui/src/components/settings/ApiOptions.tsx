import React from 'react';
import type { ChangeEvent } from 'react';
import { Input } from '../ui/input/index';
import { Label } from '../ui/label/index';
import { ApiConfigurationOptions } from '../../types/configuration';
import { ProviderType } from '../../types/providers';

interface ApiOptionsProps {
  apiConfiguration: ApiConfigurationOptions;
  setApiConfigurationField: (field: keyof ApiConfigurationOptions, value: string) => void;
}

function ApiOptions({ apiConfiguration, setApiConfigurationField }: ApiOptionsProps) {
  const handleInputChange = (
    field: keyof ApiConfigurationOptions,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    setApiConfigurationField(field, event.target.value);
  };

  const handleProviderChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setApiConfigurationField('apiProvider', event.target.value as ProviderType);
  };

  const renderApiKeyInput = () => (
    <div className="space-y-2">
      <Label htmlFor="apiKey">API Key</Label>
      <Input
        type="password"
        id="apiKey"
        value={apiConfiguration.apiKey || ''}
        onChange={(e) => handleInputChange('apiKey', e)}
        placeholder="Enter your API key"
      />
    </div>
  );

  const renderOrganizationInput = () => (
    <div className="space-y-2">
      <Label htmlFor="organizationId">Organization ID (Optional)</Label>
      <Input
        type="text"
        id="organizationId"
        value={apiConfiguration.organizationId || ''}
        onChange={(e) => handleInputChange('organizationId', e)}
        placeholder="Enter your organization ID"
      />
    </div>
  );

  const renderBaseUrlInput = () => (
    <div className="space-y-2">
      <Label htmlFor="baseUrl">Base URL (Optional)</Label>
      <Input
        type="text"
        id="baseUrl"
        value={apiConfiguration.baseUrl || ''}
        onChange={(e) => handleInputChange('baseUrl', e)}
        placeholder="Enter custom base URL"
      />
    </div>
  );

  const showOrganizationField = (provider: ProviderType): boolean => {
    return ['openai', 'openai-native'].includes(provider);
  };

  const showBaseUrlField = (provider: ProviderType): boolean => {
    return ['openai', 'anthropic', 'mistral', 'ollama', 'lmstudio', 'vscode-lm'].includes(provider);
  };

  const providers: ProviderType[] = [
    'openai',
    'anthropic',
    'ollama',
    'openrouter',
    'bedrock',
    'vertex',
    'gemini',
    'openai-native',
    'mistral',
    'deepseek',
    'glama',
    'unbound',
    'requesty'
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="apiProvider">API Provider</Label>
        <select
          id="apiProvider"
          value={apiConfiguration.apiProvider}
          onChange={handleProviderChange}
          className="w-full px-3 py-2 rounded-md border border-input bg-background"
        >
          <option value="">Select a provider</option>
          {providers.map((provider) => (
            <option key={provider} value={provider}>
              {provider.charAt(0).toUpperCase() + provider.slice(1).replace('-', ' ')}
            </option>
          ))}
        </select>
      </div>

      {apiConfiguration.apiProvider && (
        <>
          {renderApiKeyInput()}
          {showOrganizationField(apiConfiguration.apiProvider) && renderOrganizationInput()}
          {showBaseUrlField(apiConfiguration.apiProvider) && renderBaseUrlInput()}
        </>
      )}
    </div>
  );
}

export default ApiOptions;
