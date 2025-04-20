import { PineconeClient } from "@pinecone-database/pinecone";
import { openai } from "../../providers/openaiProvider";
import fs from "fs/promises";
import path from "path";
import { glob } from "glob";

export class VectorContextService {
  private pinecone: PineconeClient;
  private indexName: string;

  constructor() {
    this.pinecone = new PineconeClient();
    this.indexName = process.env.PINECONE_INDEX || "roocode";
    this.initPinecone();
  }

  private async initPinecone() {
    await this.pinecone.init({
      apiKey: process.env.PINECONE_API_KEY!,
      environment: process.env.PINECONE_ENV!
    });
  }

  /**
   * Converts text into semantic chunks for indexing.
   */
  private chunkText(text: string, maxChunkSize = 500): string[] {
    const chunks: string[] = [];
    let currentChunk = "";

    // Split by newlines first to preserve logical boundaries
    const lines = text.split("\n");

    for (const line of lines) {
      if (currentChunk.length + line.length + 1 <= maxChunkSize) {
        currentChunk += line + "\n";
      } else {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = line + "\n";
      }
    }

    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
  }

  /**
   * Index project files after commit.
   */
  async indexProject(projectId: string) {
    const workspace = path.join(process.cwd(), "workspaces", projectId);
    const files = await glob("**/*.{ts,js,tsx,jsx}", { cwd: workspace });
    const chunks: { id: string; text: string }[] = [];

    // Read and chunk all files
    for (const file of files) {
      const content = await fs.readFile(path.join(workspace, file), "utf-8");
      const fileChunks = this.chunkText(content);

      chunks.push(
        ...fileChunks.map((text, i) => ({
          id: `${projectId}/${file}#${i}`,
          text
        }))
      );
    }

    // Generate embeddings in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const embeddings = await Promise.all(
        batch.map(async (chunk) => ({
          id: chunk.id,
          values: (
            await openai.embeddings.create({
              model: "text-embedding-ada-002",
              input: chunk.text
            })
          ).data[0].embedding,
          metadata: {
            projectId,
            text: chunk.text,
            file: chunk.id.split("#")[0]
          }
        }))
      );

      // Upsert batch to Pinecone
      const index = this.pinecone.Index(this.indexName);
      await index.upsert({ vectors: embeddings });
    }

    return chunks.length;
  }

  /**
   * Search for relevant code chunks.
   */
  async search(projectId: string, query: string, topK = 5) {
    // Generate query embedding
    const queryEmbedding = (
      await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: query
      })
    ).data[0].embedding;

    // Search Pinecone
    const index = this.pinecone.Index(this.indexName);
    const results = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      filter: { projectId: { $eq: projectId } }
    });

    // Return formatted results
    return results.matches?.map((match) => ({
      text: match.metadata.text,
      file: match.metadata.file,
      score: match.score
    })) || [];
  }

  /**
   * Delete project vectors from index.
   */
  async deleteProjectVectors(projectId: string) {
    const index = this.pinecone.Index(this.indexName);
    await index.delete1({
      filter: { projectId: { $eq: projectId } }
    });
  }
}

export default VectorContextService;
