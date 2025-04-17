import { Router, Response, NextFunction } from 'express';
import { RequestHandler } from 'express-serve-static-core';
import { AuthenticatedRequest, authorize } from '../middleware/auth';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

interface ImplementationRequest {
    planPath: string;
    componentName: string;
    context?: string;
}

interface TestRequest {
    filePath: string;
    context?: string;
}

interface Component {
    name: string;
    description: string;
    dependencies: string[];
    priority: number;
    estimatedComplexity: 'low' | 'medium' | 'high';
    tasks: {
        description: string;
        type: 'implementation' | 'testing' | 'documentation';
    }[];
}

interface ProjectFile {
    path: string;
    description: string;
}

interface Plan {
    components: Component[];
    implementationOrder: string[];
    projectStructure: {
        directories: string[];
        files: ProjectFile[];
    };
}

interface TypedRequestWithBody<T> extends AuthenticatedRequest {
    body: T;
}

// Implement a component from the plan
const implementComponent: RequestHandler = async (
    req: TypedRequestWithBody<ImplementationRequest>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { planPath, componentName, context } = req.body;

        if (!planPath || !componentName) {
            res.status(400).json({
                status: 'error',
                message: 'Plan path and component name are required'
            });
            return;
        }

        // Read the plan
        if (!fs.existsSync(planPath)) {
            res.status(404).json({
                status: 'error',
                message: 'Plan not found'
            });
            return;
        }

        const plan: Plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
        
        // Find the component
        const component = plan.components.find((c: Component) => c.name === componentName);
        if (!component) {
            res.status(404).json({
                status: 'error',
                message: `Component "${componentName}" not found in the plan`
            });
            return;
        }

        // Check if dependencies are implemented
        const missingDependencies = component.dependencies.filter((dep: string) => {
            const depComponent = plan.components.find((c: Component) => c.name === dep);
            if (!depComponent) return true;
            
            // Check if the dependency has been implemented
            // This would require tracking implemented components
            // For now, we'll assume all dependencies are implemented
            return false;
        });

        if (missingDependencies.length > 0) {
            res.status(400).json({
                status: 'error',
                message: `Dependencies not implemented: ${missingDependencies.join(', ')}`
            });
            return;
        }

        // Use Ollama to generate implementation
        try {
            const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
            const ollamaModel = process.env.OLLAMA_MODEL || 'llama3:latest';

            // Create directories from project structure
            for (const dir of plan.projectStructure.directories) {
                const fullPath = path.join(process.cwd(), dir);
                if (!fs.existsSync(fullPath)) {
                    fs.mkdirSync(fullPath, { recursive: true });
                }
            }

            // Find files related to this component
            const componentFiles = plan.projectStructure.files.filter((file: ProjectFile) => 
                file.description.toLowerCase().includes(componentName.toLowerCase())
            );

            const implementedFiles: string[] = [];

            // Implement each file
            for (const file of componentFiles) {
                const prompt = `
You are an expert software developer. Implement the following component as specified in the project plan.

Component:
${JSON.stringify(component, null, 2)}

File to implement: ${file.path}
File description: ${file.description}

${context ? `Additional Context:\n${context}\n` : ''}

Project structure:
${JSON.stringify(plan.projectStructure, null, 2)}

Provide ONLY the complete code for this file without any explanations or markdown formatting.
`;

                const response = await axios.post(
                    `${ollamaUrl}/api/generate`,
                    {
                        model: ollamaModel,
                        prompt,
                        stream: false
                    }
                );

                const code = response.data.response.trim();
                
                // Create the file
                const filePath = path.join(process.cwd(), file.path);
                const fileDir = path.dirname(filePath);
                
                if (!fs.existsSync(fileDir)) {
                    fs.mkdirSync(fileDir, { recursive: true });
                }
                
                fs.writeFileSync(filePath, code);
                implementedFiles.push(filePath);
            }

            res.json({
                status: 'success',
                data: {
                    component,
                    implementedFiles,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Implementation error:', error);
            throw error;
        }
    } catch (error) {
        next(error);
    }
};

// Generate tests for a file
const generateTests: RequestHandler = async (
    req: TypedRequestWithBody<TestRequest>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { filePath, context } = req.body;

        if (!filePath) {
            res.status(400).json({
                status: 'error',
                message: 'File path is required'
            });
            return;
        }

        // Check if file exists
        const fullPath = path.join(process.cwd(), filePath);
        if (!fs.existsSync(fullPath)) {
            res.status(404).json({
                status: 'error',
                message: 'File not found'
            });
            return;
        }

        // Read the file
        const fileContent = fs.readFileSync(fullPath, 'utf8');
        const fileExt = path.extname(fullPath);
        const fileName = path.basename(fullPath);
        const testFileName = fileName.replace(fileExt, `.test${fileExt}`);
        const testDir = path.join(path.dirname(fullPath), '__tests__');
        const testPath = path.join(testDir, testFileName);

        // Use Ollama to generate tests
        try {
            const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
            const ollamaModel = process.env.OLLAMA_MODEL || 'llama3:latest';

            const prompt = `
You are an expert software tester. Generate comprehensive tests for the following code.

File: ${filePath}

Code:
${fileContent}

${context ? `Additional Context:\n${context}\n` : ''}

Provide ONLY the complete test code without any explanations or markdown formatting.
Use appropriate testing framework based on the file extension and content.
`;

            const response = await axios.post(
                `${ollamaUrl}/api/generate`,
                {
                    model: ollamaModel,
                    prompt,
                    stream: false
                }
            );

            const testCode = response.data.response.trim();
            
            // Create test directory if it doesn't exist
            if (!fs.existsSync(testDir)) {
                fs.mkdirSync(testDir, { recursive: true });
            }
            
            // Write test file
            fs.writeFileSync(testPath, testCode);

            // Run the tests if possible
            let testResults = null;
            try {
                // Determine test command based on file extension
                let testCommand = '';
                if (fileExt === '.js' || fileExt === '.ts') {
                    testCommand = `npx jest ${testPath}`;
                } else if (fileExt === '.py') {
                    testCommand = `python -m pytest ${testPath}`;
                }

                if (testCommand) {
                    const { stdout, stderr } = await execAsync(testCommand);
                    testResults = { stdout, stderr };
                }
            } catch (testError: any) {
                console.error('Test execution error:', testError);
                testResults = {
                    error: testError.message,
                    stdout: testError.stdout,
                    stderr: testError.stderr
                };
            }

            res.json({
                status: 'success',
                data: {
                    testPath,
                    testResults,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Test generation error:', error);
            throw error;
        }
    } catch (error) {
        next(error);
    }
};

// Register routes with middleware
router.post('/implement', authorize(['write']), implementComponent);
router.post('/test', authorize(['write']), generateTests);

export const implementationRouter = router;