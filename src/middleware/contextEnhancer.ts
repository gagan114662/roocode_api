import { ContextService } from '../services/context/ContextService';

/**
 * Middleware to enhance prompts with relevant context from the project
 */
export class ContextEnhancer {
  private static instance: ContextEnhancer;
  private contextService: ContextService;
  
  private constructor() {
    this.contextService = ContextService.getInstance();
  }
  
  /**
   * Get the singleton instance of ContextEnhancer
   */
  public static getInstance(): ContextEnhancer {
    if (!ContextEnhancer.instance) {
      ContextEnhancer.instance = new ContextEnhancer();
    }
    return ContextEnhancer.instance;
  }
  
  /**
   * Enhance a prompt with relevant context
   * @param projectId The project ID
   * @param prompt The original prompt
   * @param maxChunks Maximum number of chunks to include
   * @returns Enhanced prompt with context
   */
  public async enhancePrompt(projectId: string, prompt: string, maxChunks: number = 3): Promise<string> {
    // Check if project is indexed
    if (!this.contextService.isProjectIndexed(projectId)) {
      try {
        // Import ProjectService here to avoid circular dependencies
        const { ProjectService } = await import('../services/project/ProjectService');
        
        // Get project path
        const projectService = new ProjectService(projectId);
        await projectService.initialize();
        const projectPath = await projectService.getProjectPath();
        
        // Index the project
        await this.contextService.indexProject(projectId, projectPath);
      } catch (error) {
        console.error(`Error indexing project ${projectId}:`, error);
        // Continue without context if indexing fails
        return prompt;
      }
    }
    
    // Generate context
    const contextString = this.contextService.generateContextString(projectId, prompt, maxChunks);
    
    if (!contextString) {
      return prompt;
    }
    
    // Combine context with prompt
    return `${contextString}\n\nWith the above context in mind, please respond to the following:\n\n${prompt}`;
  }
}

export const contextEnhancer = ContextEnhancer.getInstance();