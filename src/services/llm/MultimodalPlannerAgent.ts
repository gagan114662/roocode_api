import { ChatMessage, chatWithImages, chatWithAll } from '../../api/openaiProvider';
import { ChatImage } from '../../api/openaiProvider';
import { BUILT_IN_FUNCTIONS, validateFunctionArgs } from './functions';
import { FunctionHandler } from './FunctionHandler';
import { ProjectService } from '../project/ProjectService';
import { MemoryService } from '../memory/MemoryService';
import { VectorContextService } from '../context/VectorContextService';
import fs from 'fs/promises';
import path from 'path';

interface PlannerResult {
  content: string;
  threadId?: string;
  functions?: {
    name: string;
    args: any;
    result: any;
  }[];
  stages?: {
    imageAnalysis?: any;
    functionCalls?: any;
  };
}

/**
 * Enhanced planner agent with multimodal capabilities
 */
export class MultimodalPlannerAgent {
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
   * Plan and execute a task with both images and functions
   */
  async plan(
    prompt: string,
    images: ChatImage[] = [],
    history: ChatMessage[] = [],
    responseId?: string
  ): Promise<PlannerResult> {
    const messages = [
      {
        role: 'system',
        content: `You are a software development assistant with access to project tools and visual analysis capabilities.
- You can analyze images and screenshots
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
    let stages: PlannerResult['stages'] | undefined;

    try {
      // Start with image analysis if images provided
      if (images.length > 0) {
        const response = await chatWithAll(
          messages,
          await this.loadImages(images),
          {
            functions: BUILT_IN_FUNCTIONS,
            response_id: responseId
          }
        );

        finalContent = response.message.content;
        stages = response.stages;

        // Extract function calls from stages if any
        if (response.stages?.functionCalls?.message?.function_call) {
          const { name, arguments: argsStr } = response.stages.functionCalls.message.function_call;
          const args = JSON.parse(argsStr);

          const errors = validateFunctionArgs(name, args);
          if (errors.length > 0) {
            throw new Error(`Invalid function arguments: ${errors.join(', ')}`);
          }

          const result = await this.executeFunction(name, {
            ...args,
            projectId: this.projectId
          });

          functionCalls.push({ name, args, result });
        }
      } else {
        // Regular function calling without images
        while (!finalContent) {
          const response = await chatWithAll(messages, [], {
            functions: BUILT_IN_FUNCTIONS,
            response_id: responseId
          });

          const message = response.message;
          messages.push(message);
          responseId = response.id;

          if (message.function_call) {
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
          } else {
            finalContent = message.content;
          }
        }
      }

      return {
        content: finalContent,
        threadId: responseId,
        functions: functionCalls,
        stages
      };
    } catch (error) {
      // Log error and return error message
      await this.functionHandler.writeMemory({
        projectId: this.projectId,
        section: 'ciIssues',
        entry: `Planning error: ${error.message}`
      });

      throw error;
    }
  }

  /**
   * Load and process images from paths or URLs
   */
  private async loadImages(images: ChatImage[]): Promise<ChatImage[]> {
    return Promise.all(
      images.map(async (image) => {
        if (image.path) {
          const data = await fs.readFile(image.path);
          return { ...image, data };
        }
        return image;
      })
    );
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

export default MultimodalPlannerAgent;
