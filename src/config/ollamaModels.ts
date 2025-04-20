export const localModels = [
  'gemma3:27b',
  'llama3:latest',
  'qwen:latest',
  'llava:latest',
  'deepseek-r1:32b',
] as const;

export type OllamaModel = typeof localModels[number];

// Model capabilities and recommended use cases
export const modelCapabilities: Record<OllamaModel, string[]> = {
  'gemma3:27b': ['code', 'refactor', 'debug'],
  'llama3:latest': ['scaffold', 'docgen'],
  'qwen:latest': ['testgen', 'cicd'],
  'llava:latest': ['debug', 'refactor'],
  'deepseek-r1:32b': ['code', 'refactor', 'testgen']
};

// Default cost-effective model per mode
export const defaultModeModelMap: Record<string, OllamaModel> = {
  scaffold: 'llama3:latest',
  refactor: 'gemma3:27b',
  testgen: 'qwen:latest',
  debug: 'llava:latest',
  code: 'deepseek-r1:32b',
  docgen: 'llama3:latest'
};

// Helper to validate model names
export function isValidOllamaModel(model: string): model is OllamaModel {
  return localModels.includes(model as OllamaModel);
}
