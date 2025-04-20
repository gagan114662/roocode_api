import * as fs from 'fs/promises';
import * as path from 'path';

interface FileInfo {
    name: string;
    type: 'file' | 'directory';
    size: number;
}

interface SearchMatch {
    file: string;
    line: number;
    content: string;
}

export class FileSystemService {
    private basePath: string;

    constructor(basePath: string) {
        this.basePath = basePath;
    }

    private resolvePath(filePath: string): string {
        return path.resolve(this.basePath, filePath);
    }

    private async ensureDirectoryExists(filePath: string): Promise<void> {
        const directory = path.dirname(filePath);
        await fs.mkdir(directory, { recursive: true });
    }

    async writeFile(filePath: string, content: string): Promise<void> {
        const fullPath = this.resolvePath(filePath);
        await this.ensureDirectoryExists(fullPath);
        await fs.writeFile(fullPath, content, 'utf8');
    }

    async readFile(filePath: string, startLine?: number, endLine?: number): Promise<string> {
        const fullPath = this.resolvePath(filePath);
        const content = await fs.readFile(fullPath, 'utf8');
        
        if (startLine !== undefined && endLine !== undefined) {
            const lines = content.split('\n');
            return lines.slice(startLine - 1, endLine).join('\n');
        }
        
        return content;
    }

    async listFiles(dirPath: string, recursive: boolean = false): Promise<FileInfo[]> {
        const fullPath = this.resolvePath(dirPath);
        const files = await fs.readdir(fullPath, { withFileTypes: true });
        
        const results: FileInfo[] = [];
        for (const file of files) {
            const filePath = path.join(fullPath, file.name);
            const stats = await fs.stat(filePath);
            
            if (file.isDirectory() && recursive) {
                const subFiles = await this.listFiles(path.join(dirPath, file.name), recursive);
                results.push(...subFiles);
            }
            
            results.push({
                name: file.name,
                type: file.isDirectory() ? 'directory' : 'file',
                size: stats.size
            });
        }
        
        return results;
    }

    async searchFiles(dirPath: string, regex: string, filePattern?: string): Promise<SearchMatch[]> {
        const fullPath = this.resolvePath(dirPath);
        const pattern = new RegExp(regex);
        const matches: SearchMatch[] = [];

        const files = await this.listFiles(dirPath, true);
        for (const file of files) {
            if (file.type === 'file') {
                if (filePattern && !new RegExp(filePattern).test(file.name)) {
                    continue;
                }

                const content = await this.readFile(path.join(dirPath, file.name));
                const lines = content.split('\n');
                
                lines.forEach((line, index) => {
                    if (pattern.test(line)) {
                        matches.push({
                            file: path.join(dirPath, file.name),
                            line: index + 1,
                            content: line.trim()
                        });
                    }
                });
            }
        }

        return matches;
    }
}
