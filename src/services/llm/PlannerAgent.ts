import { ChatMessage, chatWithFunctions } from '../../api/openaiProvider';
import { BUILT_IN_FUNCTIONS, validateFunctionArgs } from './functions';
import { FunctionHandler } from './FunctionHandler';
import { ProjectService } from '../project/ProjectService';
import { MemoryService } from '../memory/MemoryService';
import { VectorContextService } from '../context/VectorContextService';

interface PlannerResult {
  content: string;
  threadId?: string;
  functions?: {
    name: string;
    args: any;
    result: any;
  }[];
}

/**
 * High-level agent that coordinates function calls and maintains context.
 */
export class PlannerAgent {
  private functionHandler: FunctionHandler;

  constructor(
    private projectId: string,
    projectService: ProjectService,
    memoryService: MemoryService,
    vectorService: VectorContextService
  ) {
    this.functionHandler = new FunctionHandler(
      projectService,
      memoryService,
      vectorService
    );
  }

  /**
   * Plan and execute a task using available functions
   */
  async plan(
    prompt: string,
    history: ChatMessage[] = [],
    responseId?: string
  ): Promise<PlannerResult> {
    const messages = [
      {
        role: 'system',
        content: `You are a software development assistant with access to project tools like testing, file operations, and version control.
- Use the provided functions to interact with the codebase
- Break down complex tasks into smaller steps
- Verify your changes with tests
- Document important decisions
- Ask clarifying questions if needed`
      },
      ...history,
      { role: 'user', content: prompt }
    ];

    const functionCalls: PlannerResult['functions'] = [];
    let finalContent: string | undefined;

    while (!finalContent) {
      const response = await chatWithFunctions(messages, {
        functions: BUILT_IN_FUNCTIONS,
        response_id: responseId
      });

      const message = response.message;
      messages.push(message);
      responseId = response.id;

      if (message.function_call) {
        // Validate function call
        const { name, arguments: argsStr } = message.function_call;
        const args = JSON.parse(argsStr);
        const errors = validateFunctionArgs(name, args);

        if (errors.length > 0) {
          messages.push({
            role: 'function',
            name,
            content: JSON.stringify({ error: errors.join(', ') })
          });
          continue;
        }

        // Execute function
        try {
          const result = await this.executeFunction(name, {
            ...args,
            projectId: this.projectId
          });

          functionCalls.push({ name, args, result });
          messages.push({
            role: 'function',
            name,
            content: JSON.stringify(result)
          });
        } catch (error) {
          messages.push({
            role: 'function',
            name,
            content: JSON.stringify({ error: error.message })
          });
        }
      } else {
        finalContent = message.content;
      }
    }

    return {
      content: finalContent,
      threadId: responseId,
      functions: functionCalls
    };
  }

  /**
   * Execute a function call using the handler
   */
  private async executeFunction(name: string, args: any): Promise<any> {
    const handler = this.functionHandler[name];
    if (!handler) {
      throw new Error(`Unknown function: ${name}`);
    }
    return handler.call(this.functionHandler, args);
  }
}

export default PlannerAgent;
