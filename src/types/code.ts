export interface CodeTest {
  description: string;
  code: string;
}

export interface CodeMetadata {
  filename: string;
  description: string;
  dependencies?: string[];
}

export interface CodeGeneration {
  content: string;
  language: 'typescript' | 'javascript' | 'python' | 'json' | 'yaml' | 'markdown';
  metadata: CodeMetadata;
  tests?: CodeTest[];
}
