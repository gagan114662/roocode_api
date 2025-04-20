import { BaseAgent, AgentInput, AgentOutput } from '../orchestrator/Agent';
import { ModelRouterService } from '../models/ModelRouterService';
import { MemoryService } from '../memory/MemoryService';

export interface CodeAgentInput extends AgentInput {
  language?: string;
  targetPath?: string;
}

export interface CodeAgentOutput extends AgentOutput {
  result: {
    code: string;
    language: string;
    path?: string;
  };
}

export class CodeAgent extends BaseAgent<CodeAgentInput, CodeAgentOutput> {
  constructor(
    private modelRouter: ModelRouterService,
    private memoryService: MemoryService
  ) {
    super('code', ['implementation', 'refactor', 'scaffold']);
  }

  async handle(input: CodeAgentInput): Promise<CodeAgentOutput> {
    const startTime = Date.now();

    try {
      // Build context-aware prompt
      const prompt = await this.buildPrompt(input);

      // Get code generation from model
      const code = await this.modelRouter.route(prompt, this.mode);

      // Log the implementation decision
      await this.memoryService.appendToSection(
        input.projectId,
        'implementationNotes',
        `Generated code for task ${input.taskId}: ${input.description}`
      );

      // Extract language and path information
      const language = input.language || this.detectLanguage(code);
      const path = input.targetPath || this.suggestPath(code, language);

      return {
        result: {
          code,
          language,
          path
        },
        metadata: {
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime,
          mode: this.mode,
          status: 'success'
        }
      };
    } catch (error) {
      const endTime = Date.now();

      // Log the failure
      await this.memoryService.appendToSection(
        input.projectId,
        'ciIssues',
        `Code generation failed for task ${input.taskId}: ${error.message}`
      );

      return {
        result: {
          code: '',
          language: 'unknown',
        },
        metadata: {
          startTime,
          endTime,
          duration: endTime - startTime,
          mode: this.mode,
          status: 'error',
          error: error.message
        }
      };
    }
  }

  private async buildPrompt(input: CodeAgentInput): Promise<string> {
    const context = await this.memoryService.readSection(input.projectId, 'productContext');
    
    return `${context}

Current Task: ${input.description}
${input.context ? `\nContext:\n${input.context}` : ''}
${input.language ? `\nTarget Language: ${input.language}` : ''}
${input.targetPath ? `\nTarget Path: ${input.targetPath}` : ''}

Generate implementation code that:
1. Follows best practices and patterns
2. Is well-documented with comments
3. Handles errors appropriately
4. Is testable and maintainable`;
  }

  private detectLanguage(code: string): string {
    // Simple language detection based on common patterns
    if (code.includes('function') || code.includes('const')) return 'javascript';
    if (code.includes('def ')) return 'python';
    if (code.includes('class ') && code.includes('public')) return 'java';
    return 'unknown';
  }

  private suggestPath(code: string, language: string): string {
    // Simple path suggestion based on content
    const ext = {
      javascript: '.js',
      typescript: '.ts',
      python: '.py',
      java: '.java'
    }[language] || '.txt';

    // Extract name from first class/function definition
    const match = code.match(/(?:class|function|def)\s+(\w+)/);
    const name = match ? match[1] : 'generated';

    return `src/${name}${ext}`;
  }
}

export default CodeAgent;
