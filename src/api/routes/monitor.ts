import { Router, Response, NextFunction } from 'express';
import { RequestHandler } from 'express-serve-static-core';
import { AuthenticatedRequest, authorize } from '../middleware/auth';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

interface MonitorRequest {
    directory: string;
    filePattern?: string;
    scanType: 'errors' | 'security' | 'performance' | 'all';
}

interface TypedRequestWithBody<T> extends AuthenticatedRequest {
    body: T;
}

interface Issue {
    file: string;
    line?: number;
    column?: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
    code?: string;
    suggestion?: string;
}

// Scan codebase for issues
const scanCodebase: RequestHandler = async (
    req: TypedRequestWithBody<MonitorRequest>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { directory, filePattern = '**/*.{js,ts,jsx,tsx,py,java,c,cpp,go}', scanType = 'all' } = req.body;

        if (!directory) {
            res.status(400).json({
                status: 'error',
                message: 'Directory is required'
            });
            return;
        }

        const fullPath = path.join(process.cwd(), directory);
        if (!fs.existsSync(fullPath)) {
            res.status(404).json({
                status: 'error',
                message: 'Directory not found'
            });
            return;
        }

        // Find all files matching the pattern
        const files = glob.sync(path.join(fullPath, filePattern));
        
        if (files.length === 0) {
            res.json({
                status: 'success',
                data: {
                    message: 'No files found matching the pattern',
                    timestamp: new Date().toISOString()
                }
            });
            return;
        }

        // Run static analysis tools based on scan type
        const issues: Issue[] = [];

        // Run ESLint for JavaScript/TypeScript files
        const jsFiles = files.filter((file: string) => /\.(js|ts|jsx|tsx)$/.test(file));
        if (jsFiles.length > 0 && (scanType === 'all' || scanType === 'errors')) {
            try {
                const eslintCmd = `npx eslint ${jsFiles.join(' ')} --format json`;
                const { stdout } = await execAsync(eslintCmd);
                
                const eslintResults = JSON.parse(stdout);
                for (const result of eslintResults) {
                    for (const message of result.messages) {
                        issues.push({
                            file: result.filePath,
                            line: message.line,
                            column: message.column,
                            severity: message.severity === 2 ? 'error' : 'warning',
                            message: message.message,
                            code: message.ruleId
                        });
                    }
                }
            } catch (error) {
                console.error('ESLint error:', error);
                // Continue with other tools even if ESLint fails
            }
        }

        // Use Ollama to analyze code
        const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
        const ollamaModel = process.env.OLLAMA_MODEL || 'llama3:latest';

        // Process a subset of files to avoid overloading
        const filesToProcess = files.slice(0, 5); // Limit to 5 files for demo
        
        for (const file of filesToProcess) {
            try {
                // Read file content
                const content = fs.readFileSync(file, 'utf8');
                
                // Use Ollama to analyze the code
                const prompt = `
You are a code review expert. Analyze this code for ${scanType === 'all' ? 'errors, security issues, and performance problems' : scanType}.
Identify specific issues and suggest fixes. Format your response as a list of issues with severity (Error, Warning, or Info).

File: ${file}

Code:
\`\`\`
${content.slice(0, 4000)} ${content.length > 4000 ? '... (truncated)' : ''}
\`\`\`

Format each issue like this:
- Error: [Description of the error]
- Warning: [Description of the warning]
- Info: [Description of the information]
`;

                const response = await axios.post(
                    `${ollamaUrl}/api/generate`,
                    {
                        model: ollamaModel,
                        prompt,
                        stream: false
                    }
                );
                
                const analysis = response.data.response;
                
                // Parse the analysis to extract issues
                // This is a simplified approach - in a real system, we'd use more sophisticated parsing
                const issueMatches = analysis.match(/- (Error|Warning|Info|Issue):[^\n]+/g) || [];
                
                for (const match of issueMatches) {
                    const severity = match.includes('Error') ? 'error' : 
                                    match.includes('Warning') ? 'warning' : 'info';
                    const message = match.replace(/- (Error|Warning|Info|Issue):/, '').trim();
                    
                    issues.push({
                        file,
                        severity: severity as 'error' | 'warning' | 'info',
                        message,
                        suggestion: 'See analysis for details'
                    });
                }
                
                // If no specific issues were found but analysis contains potential problems
                if (issueMatches.length === 0 && 
                    (analysis.includes('problem') || 
                     analysis.includes('issue') || 
                     analysis.includes('error') || 
                     analysis.includes('warning'))) {
                    issues.push({
                        file,
                        severity: 'info',
                        message: 'Potential issues detected in code review',
                        suggestion: analysis
                    });
                }
            } catch (error) {
                console.error(`Error processing file ${file}:`, error);
                issues.push({
                    file,
                    severity: 'error',
                    message: `Error processing file: ${error instanceof Error ? error.message : String(error)}`
                });
            }
        }

        // Save issues to a report file
        const reportDir = path.join(process.cwd(), 'reports');
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = path.join(reportDir, `scan-${timestamp}.json`);
        fs.writeFileSync(reportPath, JSON.stringify({
            scanType,
            directory,
            filePattern,
            timestamp: new Date().toISOString(),
            issues
        }, null, 2));

        // For each error, use the chat service to get a fix
        const fixedIssues = [];
        for (const issue of issues.filter(i => i.severity === 'error').slice(0, 3)) { // Limit to 3 errors for demo
            try {
                // Read the file content
                const content = fs.readFileSync(issue.file, 'utf8');
                
                // Get a fix from the chat service
                const fixResponse = await axios.post(
                    'http://localhost:3000/api/v1/chat/message',
                    {
                        message: `Fix this issue in file ${issue.file}:\n${issue.message}\n\nHere's the code:\n\`\`\`\n${content}\n\`\`\``,
                        mode: 'debug'
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-Key': process.env.API_KEY || 'test-key'
                        }
                    }
                );
                
                const fix = fixResponse.data.data.response;
                
                fixedIssues.push({
                    issue,
                    fix
                });
            } catch (error) {
                console.error(`Error getting fix for issue in ${issue.file}:`, error);
            }
        }

        res.json({
            status: 'success',
            data: {
                scannedFiles: files.length,
                processedFiles: filesToProcess.length,
                issues,
                fixedIssues,
                reportPath,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        next(error);
    }
};

// Register routes with middleware
router.post('/scan', authorize(['read']), scanCodebase);

export const monitorRouter = router;