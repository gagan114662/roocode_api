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
        const dependencies = component.dependencies;
        
        // Use Ollama to generate implementation
        try {
            const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
            const ollamaModel = process.env.OLLAMA_MODEL || 'llama3:latest';

            // Create directories from project structure
            const projectRoot = path.dirname(planPath);
            for (const dir of plan.projectStructure.directories) {
                const fullPath = path.join(projectRoot, dir);
                if (!fs.existsSync(fullPath)) {
                    fs.mkdirSync(fullPath, { recursive: true });
                }
            }

            // Determine which files to implement based on component name
            // First, try to find files that explicitly mention the component in their description
            let componentFiles = plan.projectStructure.files.filter((file: ProjectFile) => 
                file.description.toLowerCase().includes(componentName.toLowerCase().replace(/\s+/g, '-')) ||
                file.description.toLowerCase().includes(componentName.toLowerCase().replace(/\s+/g, '_')) ||
                file.description.toLowerCase().includes(componentName.toLowerCase())
            );

            // If no files found, create new files based on component name
            if (componentFiles.length === 0) {
                // Determine file extension based on project type
                let fileExtension = '.js';
                if (context && context.includes('typescript')) {
                    fileExtension = '.ts';
                } else if (context && context.includes('python')) {
                    fileExtension = '.py';
                } else if (context && context.includes('java')) {
                    fileExtension = '.java';
                }

                // Create a new file for the component
                const fileName = componentName.toLowerCase().replace(/\s+/g, '-') + fileExtension;
                const filePath = path.join('src', fileName);
                
                componentFiles = [{
                    path: filePath,
                    description: `Implementation of ${componentName}`
                }];

                // Add the file to the plan
                plan.projectStructure.files.push(componentFiles[0]);
                fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
            }

            const implementedFiles: string[] = [];

            // Implement each file
            for (const file of componentFiles) {
                // Determine the file type based on extension
                const fileExtension = path.extname(file.path).toLowerCase();
                let fileType = 'javascript';
                
                if (fileExtension === '.ts') fileType = 'typescript';
                else if (fileExtension === '.py') fileType = 'python';
                else if (fileExtension === '.java') fileType = 'java';
                else if (fileExtension === '.html') fileType = 'html';
                else if (fileExtension === '.css') fileType = 'css';
                else if (fileExtension === '.md') fileType = 'markdown';
                
                // Get information about dependencies
                const dependencyInfo = await Promise.all(dependencies.map(async (dep) => {
                    const depComponent = plan.components.find(c => c.name === dep);
                    if (!depComponent) return `${dep}: No information available`;
                    
                    return `${dep}: ${depComponent.description}`;
                }));

                // Create a detailed prompt for the implementation
                const prompt = `
You are an expert software developer. Implement the following component as specified in the project plan.

Component: ${componentName}
Description: ${component.description}
Dependencies: ${dependencyInfo.join('\n')}

File to implement: ${file.path}
File description: ${file.description}
File type: ${fileType}

${context ? `Additional Context:\n${context}\n` : ''}

Project structure:
${JSON.stringify(plan.projectStructure, null, 2)}

Tasks for this component:
${component.tasks.map(task => `- ${task.description} (${task.type})`).join('\n')}

Provide ONLY the complete code for this file without any explanations or markdown formatting.
The code should be high-quality, well-structured, and follow best practices for ${fileType}.
Include appropriate comments and documentation.
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
                const filePath = path.join(projectRoot, file.path);
                const fileDir = path.dirname(filePath);
                
                if (!fs.existsSync(fileDir)) {
                    fs.mkdirSync(fileDir, { recursive: true });
                }
                
                fs.writeFileSync(filePath, code);
                implementedFiles.push(filePath);
                
                console.log(`Implemented file: ${filePath}`);
            }

            // If this is a UI component, create additional HTML/CSS files if needed
            if (componentName.toLowerCase().includes('ui') || 
                componentName.toLowerCase().includes('interface') || 
                componentName.toLowerCase().includes('component')) {
                
                // Check if we need to create an HTML file
                const hasHtmlFile = componentFiles.some(file => file.path.endsWith('.html'));
                if (!hasHtmlFile) {
                    const htmlFileName = `${componentName.toLowerCase().replace(/\s+/g, '-')}.html`;
                    const htmlFilePath = path.join(projectRoot, 'src', htmlFileName);
                    
                    // Generate HTML content
                    const htmlPrompt = `
Create an HTML file for the ${componentName} component.
Description: ${component.description}

The HTML should be well-structured, semantic, and follow best practices.
Include appropriate comments.

Provide ONLY the complete HTML code without any explanations or markdown formatting.
`;

                    const htmlResponse = await axios.post(
                        `${ollamaUrl}/api/generate`,
                        {
                            model: ollamaModel,
                            prompt: htmlPrompt,
                            stream: false
                        }
                    );

                    const htmlCode = htmlResponse.data.response.trim();
                    
                    // Create the HTML file
                    const htmlFileDir = path.dirname(htmlFilePath);
                    if (!fs.existsSync(htmlFileDir)) {
                        fs.mkdirSync(htmlFileDir, { recursive: true });
                    }
                    
                    fs.writeFileSync(htmlFilePath, htmlCode);
                    implementedFiles.push(htmlFilePath);
                    
                    console.log(`Implemented HTML file: ${htmlFilePath}`);
                }
                
                // Check if we need to create a CSS file
                const hasCssFile = componentFiles.some(file => file.path.endsWith('.css'));
                if (!hasCssFile) {
                    const cssFileName = `${componentName.toLowerCase().replace(/\s+/g, '-')}.css`;
                    const cssFilePath = path.join(projectRoot, 'src', cssFileName);
                    
                    // Generate CSS content
                    const cssPrompt = `
Create a CSS file for the ${componentName} component.
Description: ${component.description}

The CSS should be well-structured, maintainable, and follow best practices.
Include appropriate comments.

Provide ONLY the complete CSS code without any explanations or markdown formatting.
`;

                    const cssResponse = await axios.post(
                        `${ollamaUrl}/api/generate`,
                        {
                            model: ollamaModel,
                            prompt: cssPrompt,
                            stream: false
                        }
                    );

                    const cssCode = cssResponse.data.response.trim();
                    
                    // Create the CSS file
                    const cssFileDir = path.dirname(cssFilePath);
                    if (!fs.existsSync(cssFileDir)) {
                        fs.mkdirSync(cssFileDir, { recursive: true });
                    }
                    
                    fs.writeFileSync(cssFilePath, cssCode);
                    implementedFiles.push(cssFilePath);
                    
                    console.log(`Implemented CSS file: ${cssFilePath}`);
                }
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
        const fullPath = path.resolve(filePath);
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
        const fileName = path.basename(fullPath, fileExt);
        
        // Determine test framework based on file extension
        let testFramework = 'jest';
        let testFileExt = '.test' + fileExt;
        
        if (fileExt === '.py') {
            testFramework = 'pytest';
            testFileExt = '_test.py';
        } else if (fileExt === '.java') {
            testFramework = 'junit';
            testFileExt = 'Test.java';
        }
        
        // Create test directory if it doesn't exist
        const fileDir = path.dirname(fullPath);
        const testDir = path.join(fileDir, '__tests__');
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        
        const testPath = path.join(testDir, fileName + testFileExt);

        // Use Ollama to generate tests
        try {
            const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
            const ollamaModel = process.env.OLLAMA_MODEL || 'llama3:latest';

            const prompt = `
You are an expert software tester. Generate comprehensive tests for the following code using ${testFramework}.

File: ${filePath}

Code:
${fileContent}

${context ? `Additional Context:\n${context}\n` : ''}

The tests should:
1. Cover all functions and methods in the code
2. Include both positive and negative test cases
3. Test edge cases
4. Be well-structured and follow best practices for ${testFramework}
5. Include appropriate comments and documentation

Provide ONLY the complete test code without any explanations or markdown formatting.
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
            
            // Write test file
            fs.writeFileSync(testPath, testCode);
            
            console.log(`Generated test file: ${testPath}`);

            // Run the tests if possible
            let testResults = null;
            try {
                // Determine test command based on file extension and framework
                let testCommand = '';
                if (fileExt === '.js' || fileExt === '.ts') {
                    // Install Jest if not already installed
                    try {
                        await execAsync('npm list jest || npm install --save-dev jest');
                    } catch (error) {
                        console.error('Error installing Jest:', error);
                    }
                    
                    testCommand = `npx jest ${testPath}`;
                } else if (fileExt === '.py') {
                    testCommand = `python -m pytest ${testPath}`;
                } else if (fileExt === '.java') {
                    testCommand = `javac ${fullPath} ${testPath} && java -cp . org.junit.runner.JUnitCore ${fileName}Test`;
                }

                if (testCommand) {
                    console.log(`Running tests with command: ${testCommand}`);
                    const { stdout, stderr } = await execAsync(testCommand);
                    testResults = { stdout, stderr, success: !stderr };
                    console.log(`Test results: ${stdout}`);
                    if (stderr) console.error(`Test errors: ${stderr}`);
                }
            } catch (testError: any) {
                console.error('Test execution error:', testError);
                testResults = {
                    error: testError.message,
                    stdout: testError.stdout,
                    stderr: testError.stderr,
                    success: false
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