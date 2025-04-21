import fs from 'fs/promises';
import path from 'path';

export interface FileOperation {
  success: boolean;
  error?: string;
}

export interface FileReadResult extends FileOperation {
  content?: string;
}

export interface FileMetadata {
  name: string;
  path: string;
  size: number;
  created: Date;
  modified: Date;
  isDirectory: boolean;
}

export class FileService {
  private static instance: FileService;

  private constructor() {}

  public static getInstance(): FileService {
    if (!FileService.instance) {
      FileService.instance = new FileService();
    }
    return FileService.instance;
  }

  public async writeFile(filePath: string, content: string): Promise<FileOperation> {
    try {
      await this.ensureDirectoryExists(path.dirname(filePath));
      await fs.writeFile(filePath, content, 'utf-8');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  public async readFile(filePath: string): Promise<FileReadResult> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return { success: true, content };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  public async ensureDirectoryExists(dirPath: string): Promise<FileOperation> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  public async deleteFile(filePath: string): Promise<FileOperation> {
    try {
      await fs.unlink(filePath);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  public async deleteDirectory(dirPath: string, recursive: boolean = true): Promise<FileOperation> {
    try {
      await fs.rm(dirPath, { recursive, force: true });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  public async listFiles(dirPath: string): Promise<FileMetadata[]> {
    try {
      const files = await fs.readdir(dirPath);
      const filePromises = files.map(async (file) => {
        const fullPath = path.join(dirPath, file);
        const stats = await fs.stat(fullPath);
        return {
          name: file,
          path: fullPath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          isDirectory: stats.isDirectory()
        };
      });
      return Promise.all(filePromises);
    } catch {
      return [];
    }
  }

  public async moveFile(oldPath: string, newPath: string): Promise<FileOperation> {
    try {
      await this.ensureDirectoryExists(path.dirname(newPath));
      await fs.rename(oldPath, newPath);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  public async copyFile(sourcePath: string, destPath: string): Promise<FileOperation> {
    try {
      await this.ensureDirectoryExists(path.dirname(destPath));
      await fs.copyFile(sourcePath, destPath);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  public async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  public async readJson<T>(filePath: string): Promise<T | null> {
    const result = await this.readFile(filePath);
    if (!result.success || !result.content) {
      return null;
    }
    
    try {
      return JSON.parse(result.content) as T;
    } catch {
      return null;
    }
  }

  public async writeJson(filePath: string, data: unknown): Promise<FileOperation> {
    try {
      const content = JSON.stringify(data, null, 2);
      return await this.writeFile(filePath, content);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

export const fileService = FileService.getInstance();