import { Agent, AgentInput, AgentOutput } from './Agent';
import { CostForecastService } from '../cost/CostForecastService';
import { MemoryService } from '../memory/MemoryService';

export interface TaskNode {
  id: number;
  description: string;
  ownerMode: string;
  children: TaskNode[];
  metadata?: {
    [key: string]: any;
  };
}

export interface ExecutionResult {
  taskId: number;
  ownerMode: string;
  output: AgentOutput;
  children: ExecutionResult[];
  executionTime: number;
  startTime: number;
  endTime: number;
}

export class OrchestratorService {
  private memoryService: MemoryService;

  constructor(
    private agents: Record<string, Agent<AgentInput, AgentOutput>>,
    private costSvc: CostForecastService,
    memoryService?: MemoryService
  ) {
    this.memoryService = memoryService || new MemoryService();
  }

  /**
   * Runs the full plan tree, depth-first by default.
   * Returns a map of taskId → execution results.
   */
  async runPlan(
    root: TaskNode,
    projectId: string,
    context = ''
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // Log start of execution
      await this.memoryService.appendToSection(
        projectId,
        'executionLog',
        `Starting execution of task ${root.id}: ${root.description}`
      );

      // Execute this node
      const output = await this.executeNode(root, projectId, context);

      // Execute children with updated context
      const newContext = this.buildChildContext(context, output);
      const children: ExecutionResult[] = [];

      for (const child of root.children) {
        const childResult = await this.runPlan(child, projectId, newContext);
        children.push(childResult);
      }

      const endTime = Date.now();

      // Log successful completion
      await this.memoryService.appendToSection(
        projectId,
        'executionLog',
        `Completed task ${root.id} in ${endTime - startTime}ms`
      );

      return {
        taskId: root.id,
        ownerMode: root.ownerMode,
        output,
        children,
        executionTime: endTime - startTime,
        startTime,
        endTime
      };
    } catch (error) {
      const endTime = Date.now();

      // Log failure
      await this.memoryService.appendToSection(
        projectId,
        'ciIssues',
        `Failed to execute task ${root.id}: ${error.message}`
      );

      throw new Error(`Task ${root.id} failed: ${error.message}`);
    }
  }

  /**
   * Estimates the cost of executing a plan tree.
   */
  async estimatePlanCost(
    root: TaskNode,
    modelMap?: Record<string, string>
  ): Promise<number> {
    // Calculate cost for this node
    const agent = this.agents[root.ownerMode];
    if (!agent) {
      throw new Error(`No agent found for mode: ${root.ownerMode}`);
    }

    const model = modelMap?.[root.ownerMode];
    const nodeCost = await this.costSvc.estimatePromptCost(
      root.description,
      model || 'gpt-4-turbo'
    );

    // Recursively calculate costs for children
    const childCosts = await Promise.all(
      root.children.map(child => this.estimatePlanCost(child, modelMap))
    );

    return nodeCost + childCosts.reduce((sum, cost) => sum + cost, 0);
  }

  /**
   * Validates a plan tree configuration.
   */
  validatePlan(root: TaskNode): string[] {
    const errors: string[] = [];

    const validate = (node: TaskNode) => {
      // Check if we have an agent for this mode
      if (!this.agents[node.ownerMode]) {
        errors.push(`No agent found for mode: ${node.ownerMode} in task ${node.id}`);
      }

      // Check required fields
      if (!node.description) {
        errors.push(`Missing description for task ${node.id}`);
      }

      // Recursively validate children
      node.children.forEach(child => validate(child));
    };

    validate(root);
    return errors;
  }

  private async executeNode(
    node: TaskNode,
    projectId: string,
    context: string
  ): Promise<AgentOutput> {
    const agent = this.agents[node.ownerMode];
    if (!agent) {
      throw new Error(`No agent found for mode: ${node.ownerMode}`);
    }

    return await agent.handle({
      description: node.description,
      context,
      projectId,
      taskId: node.id,
      ...node.metadata
    });
  }

  private buildChildContext(parentContext: string, parentOutput: AgentOutput): string {
    // Build context from parent output based on agent type
    if (parentOutput.result?.code) {
      return `${parentContext}\n\nImplemented Code:\n\`\`\`\n${parentOutput.result.code}\n\`\`\``;
    }
    if (parentOutput.result?.testCode) {
      return `${parentContext}\n\nTest Implementation:\n\`\`\`\n${parentOutput.result.testCode}\n\`\`\``;
    }
    return parentContext;
  }
}

export default OrchestratorService;
