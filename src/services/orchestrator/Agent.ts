/**
 * Common interface for all agents in the system.
 */
export interface Agent<TInput = any, TOutput = any> {
  /**
   * Handle one step/task.
   * @param input Information the agent needs (task description, context, etc.)
   * @returns The agent's result (code, test suite, report, etc.)
   */
  handle(input: TInput): Promise<TOutput>;

  /**
   * Get the agent's mode identifier.
   */
  getMode(): string;

  /**
   * Get the agent's capabilities.
   */
  getCapabilities(): string[];
}

/**
 * Base implementation with common functionality.
 */
export abstract class BaseAgent<TInput = any, TOutput = any> implements Agent<TInput, TOutput> {
  constructor(
    protected readonly mode: string,
    protected readonly capabilities: string[] = []
  ) {}

  abstract handle(input: TInput): Promise<TOutput>;

  getMode(): string {
    return this.mode;
  }

  getCapabilities(): string[] {
    return [...this.capabilities];
  }
}

/**
 * Standard input interface for agents.
 */
export interface AgentInput {
  description: string;
  context: string;
  projectId: string;
  taskId: number;
}

/**
 * Standard output interface for agents.
 */
export interface AgentOutput {
  result: any;
  metadata: {
    startTime: number;
    endTime: number;
    duration: number;
    mode: string;
    model?: string;
    status: 'success' | 'error';
    error?: string;
  };
}
