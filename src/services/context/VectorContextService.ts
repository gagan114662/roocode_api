export interface VectorContextService {
  search(projectId: string, query: string, limit?: number): Promise<Array<{
    text: string;
    file: string;
    score: number;
  }>>;
}
