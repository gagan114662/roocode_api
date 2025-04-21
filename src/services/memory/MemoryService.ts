export interface MemoryService {
  appendToSection(projectId: string, section: string, content: string): Promise<void>;
  readSection(projectId: string, section: string): Promise<string>;
}
