// src/plugins/types.ts
export interface TaskRequest {
  projectId: string;
  prompt: string;
  language?: string;
  framework?: string;
  features: string[];
  api?: boolean;
  mode?: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface ValidationResult {
  success: boolean;
  errors?: string[];
  warnings?: string[];
  logs?: string;
}

export interface CodePlugin {
  name: string;
  version: string;
  metadata: {
    languages: string[];
    frameworks: string[];
    features: string[];
  };

  canHandle(request: TaskRequest): boolean;
  implement(request: TaskRequest): Promise<GeneratedFile[]>;
  validate(workspacePath: string): Promise<ValidationResult>;
}
