import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

interface CodeChunk {
  filePath: string;
  content: string;
  startLine: number;
  endLine: number;
}

interface ProjectContext {
  projectId: string;
  chunks: CodeChunk[];
  lastUpdated: Date;
}

/**
 * ContextService provides smart recall functionality by:
 * 1. Reading project files and splitting them into chunks
 * 2. Caching these chunks in memory
 * 3. Retrieving relevant chunks for follow-up prompts
 */
export class ContextService {
  private static instance: ContextService;
  private projectContexts: Map<string, ProjectContext> = new Map();
  
  // Maximum size of each chunk in lines
  private readonly CHUNK_SIZE = 50;
  
  // File patterns to include/exclude
  private readonly INCLUDE_PATTERNS = ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx', '**/*.json'];
  private readonly EXCLUDE_PATTERNS = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'];
  
  private constructor() {}
  
  /**
   * Get the singleton instance of ContextService
   */
  public static getInstance(): ContextService {
    if (!ContextService.instance) {
      ContextService.instance = new ContextService();
    }
    return ContextService.instance;
  }
  
  /**
   * Read project files, split into chunks, and cache in memory
   * @param projectId The project ID
   * @param projectPath The path to the project
   */
  public async indexProject(projectId: string, projectPath: string): Promise<void> {
    const chunks: CodeChunk[] = [];
    
    // Find all files matching the include patterns
    const files: string[] = [];
    for (const pattern of this.INCLUDE_PATTERNS) {
      const matches = await glob(pattern, { 
        cwd: projectPath, 
        ignore: this.EXCLUDE_PATTERNS,
        absolute: true
      });
      files.push(...matches);
    }
    
    // Process each file
    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        
        // Split file into chunks
        for (let i = 0; i < lines.length; i += this.CHUNK_SIZE) {
          const startLine = i;
          const endLine = Math.min(i + this.CHUNK_SIZE, lines.length);
          const chunkContent = lines.slice(startLine, endLine).join('\n');
          
          chunks.push({
            filePath: path.relative(projectPath, filePath),
            content: chunkContent,
            startLine,
            endLine
          });
        }
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
      }
    }
    
    // Store in cache
    this.projectContexts.set(projectId, {
      projectId,
      chunks,
      lastUpdated: new Date()
    });
  }
  
  /**
   * Find relevant chunks for a prompt
   * @param projectId The project ID
   * @param prompt The user prompt
   * @param maxChunks Maximum number of chunks to return
   * @returns Array of relevant code chunks
   */
  public findRelevantChunks(projectId: string, prompt: string, maxChunks: number = 3): CodeChunk[] {
    const context = this.projectContexts.get(projectId);
    if (!context) {
      return [];
    }
    
    // Simple relevance scoring based on term frequency
    const promptTerms = prompt.toLowerCase().split(/\W+/).filter(term => term.length > 2);
    
    const scoredChunks = context.chunks.map(chunk => {
      const chunkContent = chunk.content.toLowerCase();
      let score = 0;
      
      for (const term of promptTerms) {
        // Count occurrences of the term in the chunk
        const regex = new RegExp(term, 'g');
        const matches = chunkContent.match(regex);
        if (matches) {
          score += matches.length;
        }
      }
      
      return { chunk, score };
    });
    
    // Sort by score (descending) and take top N
    return scoredChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, maxChunks)
      .map(item => item.chunk);
  }
  
  /**
   * Generate context string from relevant chunks
   * @param projectId The project ID
   * @param prompt The user prompt
   * @param maxChunks Maximum number of chunks to include
   * @returns Formatted context string to prepend to LLM prompt
   */
  public generateContextString(projectId: string, prompt: string, maxChunks: number = 3): string {
    const relevantChunks = this.findRelevantChunks(projectId, prompt, maxChunks);
    
    if (relevantChunks.length === 0) {
      return '';
    }
    
    let contextString = 'Here are some relevant code snippets from the project:\n\n';
    
    for (const chunk of relevantChunks) {
      contextString += `File: ${chunk.filePath} (lines ${chunk.startLine + 1}-${chunk.endLine}):\n`;
      contextString += '```\n';
      contextString += chunk.content;
      contextString += '\n```\n\n';
    }
    
    return contextString;
  }
  
  /**
   * Check if a project is indexed
   * @param projectId The project ID
   * @returns True if the project is indexed
   */
  public isProjectIndexed(projectId: string): boolean {
    return this.projectContexts.has(projectId);
  }
  
  /**
   * Clear the cache for a project
   * @param projectId The project ID
   */
  public clearProjectCache(projectId: string): void {
    this.projectContexts.delete(projectId);
  }
  
  /**
   * Clear all project caches
   */
  public clearAllCaches(): void {
    this.projectContexts.clear();
  }
}