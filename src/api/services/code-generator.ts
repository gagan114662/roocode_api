import { chatService } from './chat-service';
import { FileSystemService } from '../../services/filesystem';
import path from 'path';

class CodeGeneratorService {
    private static instance: CodeGeneratorService;
    private fileSystem: FileSystemService;

    private constructor() {
        this.fileSystem = new FileSystemService(process.cwd());
    }

    public static getInstance(): CodeGeneratorService {
        if (!CodeGeneratorService.instance) {
            CodeGeneratorService.instance = new CodeGeneratorService();
        }
        return CodeGeneratorService.instance;
    }

    public async generateAndSaveCode(prompt: string, filePath: string): Promise<string> {
        try {
            // Generate code using chat service
            const response = await chatService.handleMessage(prompt, 'code');
            
            // Extract code from the response
            let code = response;
            
            // If response contains markdown code blocks, extract the code
            if (response.includes('```')) {
                const codeMatch = response.match(/```(?:python)?([\s\S]*?)```/);
                if (codeMatch && codeMatch[1]) {
                    code = codeMatch[1].trim();
                }
            }
            
            // Save the generated code
            await this.fileSystem.writeFile(filePath, code);
            
            return code;
        } catch (error) {
            console.error('Error in code generation:', error);
            throw new Error('Failed to generate and save code');
        }
    }
}

export const codeGenerator = CodeGeneratorService.getInstance();