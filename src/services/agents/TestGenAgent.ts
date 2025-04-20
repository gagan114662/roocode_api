import { BaseAgent, AgentInput, AgentOutput } from '../orchestrator/Agent';
import { ModelRouterService } from '../models/ModelRouterService';
import { MemoryService } from '../memory/MemoryService';

export interface TestGenInput extends AgentInput {
  sourcePath: string;
  sourceCode: string;
  testFramework?: string;
}

export interface TestGenOutput extends AgentOutput {
  result: {
    testCode: string;
    testPath: string;
    coverage: {
      statements?: number;
      branches?: number;
      functions?: number;
      lines?: number;
    };
  };
}

export class TestGenAgent extends BaseAgent<TestGenInput, TestGenOutput> {
  constructor(
    private modelRouter: ModelRouterService,
    private memoryService: MemoryService
  ) {
    super('testgen', ['unit-test', 'integration-test', 'e2e-test']);
  }

  async handle(input: TestGenInput): Promise<TestGenOutput> {
    const startTime = Date.now();

    try {
      // Build context-aware prompt
      const prompt = await this.buildPrompt(input);

      // Get test generation from model
      const testCode = await this.modelRouter.route(prompt, this.mode);

      // Log the test generation decision
      await this.memoryService.appendToSection(
        input.projectId,
        'testCoverage',
        `Generated tests for task ${input.taskId}: ${input.description}`
      );

      const testPath = this.suggestTestPath(input.sourcePath);
      const coverage = this.estimateCoverage(testCode, input.sourceCode);

      return {
        result: {
          testCode,
          testPath,
          coverage
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
        `Test generation failed for task ${input.taskId}: ${error.message}`
      );

      return {
        result: {
          testCode: '',
          testPath: '',
          coverage: {}
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

  private async buildPrompt(input: TestGenInput): Promise<string> {
    const context = await this.memoryService.readSection(input.projectId, 'implementationNotes');
    
    return `${context}

Source Code to Test:
\`\`\`
${input.sourceCode}
\`\`\`

Current Task: ${input.description}
${input.context ? `\nContext:\n${input.context}` : ''}
${input.testFramework ? `\nTest Framework: ${input.testFramework}` : ''}

Generate comprehensive tests that:
1. Cover all main functionality
2. Include edge cases and error scenarios
3. Follow testing best practices
4. Are maintainable and readable
5. Include clear test descriptions`;
  }

  private suggestTestPath(sourcePath: string): string {
    // Convert source path to test path
    const dir = path.dirname(sourcePath);
    const ext = path.extname(sourcePath);
    const name = path.basename(sourcePath, ext);

    const testDir = dir.replace(/\/src\//, '/__tests__/');
    return path.join(testDir, `${name}.test${ext}`);
  }

  private estimateCoverage(testCode: string, sourceCode: string): TestGenOutput['result']['coverage'] {
    // Simple coverage estimation based on pattern matching
    const functionMatches = sourceCode.match(/(?:function|class|const\s+\w+\s*=\s*(?:async\s*)?(?:\(|\=\>))/g) || [];
    const functionTests = testCode.match(/(?:it|test)\s*\(\s*['"`]/g) || [];

    const coverage = functionTests.length / functionMatches.length;

    return {
      statements: coverage * 100,
      branches: coverage * 90, // Estimate slightly lower branch coverage
      functions: coverage * 100,
      lines: coverage * 95
    };
  }
}

export default TestGenAgent;

// Add missing import at the top
import path from 'path';
