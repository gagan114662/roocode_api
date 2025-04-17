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
    autoFix?: boolean;
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
        const { directory, filePattern = '**/*.{js,ts,jsx,tsx,py,java,c,cpp,go}', scanType = 'all', autoFix = false } = req.body;

        if (!directory) {
            res.status(400).json({
                status: 'error',
                message: 'Directory is required'
            });
            return;
        }

        const fullPath = path.resolve(directory);
        
        // Check if directory exists, if not create it
        if (!fs.existsSync(fullPath)) {
            try {
                fs.mkdirSync(fullPath, { recursive: true });
                console.log(`Created directory: ${fullPath}`);
            } catch (error) {
                res.status(500).json({
                    status: 'error',
                    message: `Failed to create directory: ${error instanceof Error ? error.message : String(error)}`
                });
                return;
            }
        }

        // Find all files matching the pattern
        let files: string[] = [];
        try {
            files = glob.sync(path.join(fullPath, filePattern));
        } catch (error) {
            console.error('Error finding files:', error);
            res.status(500).json({
                status: 'error',
                message: `Error finding files: ${error instanceof Error ? error.message : String(error)}`
            });
            return;
        }
        
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
                // Check if ESLint is installed
                try {
                    await execAsync('npx eslint --version');
                } catch (error) {
                    console.log('ESLint not found, installing...');
                    await execAsync('npm install --save-dev eslint');
                }
                
                // Create basic ESLint config if it doesn't exist
                const eslintConfigPath = path.join(fullPath, '.eslintrc.json');
                if (!fs.existsSync(eslintConfigPath)) {
                    const basicConfig = {
                        "env": {
                            "browser": true,
                            "es2021": true,
                            "node": true
                        },
                        "extends": "eslint:recommended",
                        "parserOptions": {
                            "ecmaVersion": "latest",
                            "sourceType": "module"
                        },
                        "rules": {}
                    };
                    fs.writeFileSync(eslintConfigPath, JSON.stringify(basicConfig, null, 2));
                    console.log(`Created ESLint config: ${eslintConfigPath}`);
                }
                
                // Run ESLint
                const eslintCmd = `npx eslint ${jsFiles.join(' ')} --format json`;
                const { stdout } = await execAsync(eslintCmd);
                
                if (stdout.trim()) {
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
                }
            } catch (error) {
                console.error('ESLint error:', error);
                // Continue with other tools even if ESLint fails
            }
        }

        // Run security scan for all files
        if (scanType === 'all' || scanType === 'security') {
            try {
                // Check for common security issues
                for (const file of files) {
                    const content = fs.readFileSync(file, 'utf8');
                    
                    // Check for hardcoded secrets
                    const secretPatterns = [
                        /password\s*=\s*['"][^'"]+['"]/i,
                        /api[_\s]*key\s*=\s*['"][^'"]+['"]/i,
                        /secret\s*=\s*['"][^'"]+['"]/i,
                        /token\s*=\s*['"][^'"]+['"]/i
                    ];
                    
                    for (const pattern of secretPatterns) {
                        const matches = content.match(pattern);
                        if (matches) {
                            for (const match of matches) {
                                // Find line number
                                const lines = content.split('\n');
                                let lineNumber = 0;
                                for (let i = 0; i < lines.length; i++) {
                                    if (lines[i].includes(match)) {
                                        lineNumber = i + 1;
                                        break;
                                    }
                                }
                                
                                issues.push({
                                    file,
                                    line: lineNumber,
                                    severity: 'error',
                                    message: `Potential hardcoded secret found: ${match}`,
                                    code: 'security/no-hardcoded-secrets',
                                    suggestion: 'Use environment variables or a secure vault for secrets'
                                });
                            }
                        }
                    }
                    
                    // Check for SQL injection vulnerabilities
                    if (content.includes('sql') || content.includes('query')) {
                        const sqlInjectionPatterns = [
                            /execute\s*\(\s*["'`].*\$\{.*\}/i,
                            /query\s*\(\s*["'`].*\$\{.*\}/i,
                            /sql\s*=.*\+/i
                        ];
                        
                        for (const pattern of sqlInjectionPatterns) {
                            const matches = content.match(pattern);
                            if (matches) {
                                for (const match of matches) {
                                    // Find line number
                                    const lines = content.split('\n');
                                    let lineNumber = 0;
                                    for (let i = 0; i < lines.length; i++) {
                                        if (lines[i].includes(match)) {
                                            lineNumber = i + 1;
                                            break;
                                        }
                                    }
                                    
                                    issues.push({
                                        file,
                                        line: lineNumber,
                                        severity: 'error',
                                        message: `Potential SQL injection vulnerability: ${match}`,
                                        code: 'security/no-sql-injection',
                                        suggestion: 'Use parameterized queries or an ORM'
                                    });
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Security scan error:', error);
            }
        }

        // Run performance scan for all files
        if (scanType === 'all' || scanType === 'performance') {
            try {
                for (const file of files) {
                    const content = fs.readFileSync(file, 'utf8');
                    
                    // Check for inefficient loops
                    const inefficientLoopPatterns = [
                        /for\s*\(\s*let\s+i\s*=\s*0\s*;\s*i\s*<\s*array\.length\s*;/i,
                        /while\s*\(\s*i\s*<\s*array\.length\s*\)/i
                    ];
                    
                    for (const pattern of inefficientLoopPatterns) {
                        const matches = content.match(pattern);
                        if (matches) {
                            for (const match of matches) {
                                // Find line number
                                const lines = content.split('\n');
                                let lineNumber = 0;
                                for (let i = 0; i < lines.length; i++) {
                                    if (lines[i].includes(match)) {
                                        lineNumber = i + 1;
                                        break;
                                    }
                                }
                                
                                issues.push({
                                    file,
                                    line: lineNumber,
                                    severity: 'warning',
                                    message: `Inefficient loop pattern: ${match}`,
                                    code: 'performance/inefficient-loop',
                                    suggestion: 'Cache array.length outside the loop or use for...of loops'
                                });
                            }
                        }
                    }
                    
                    // Check for memory leaks in event listeners
                    if (content.includes('addEventListener') && !content.includes('removeEventListener')) {
                        const lines = content.split('\n');
                        for (let i = 0; i < lines.length; i++) {
                            if (lines[i].includes('addEventListener')) {
                                issues.push({
                                    file,
                                    line: i + 1,
                                    severity: 'warning',
                                    message: 'Event listener without corresponding removeEventListener',
                                    code: 'performance/memory-leak',
                                    suggestion: 'Add removeEventListener when the component is unmounted'
                                });
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Performance scan error:', error);
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
                
                // Skip empty files
                if (!content.trim()) continue;
                
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

        // For each error, use the chat service to get a fix if autoFix is enabled
        const fixedIssues = [];
        if (autoFix) {
            // Only fix errors, not warnings or info
            const errorsToFix = issues.filter(i => i.severity === 'error').slice(0, 3); // Limit to 3 errors for demo
            
            for (const issue of errorsToFix) {
                try {
                    // Read the file content
                    const filePath = issue.file;
                    if (!fs.existsSync(filePath)) continue;
                    
                    const content = fs.readFileSync(filePath, 'utf8');
                    
                    // Get a fix from the chat service
                    const fixResponse = await axios.post(
                        `http://localhost:3000/api/v1/chat/message`,
                        {
                            message: `Fix this issue in file ${filePath}:\n${issue.message}\n\nHere's the code:\n\`\`\`\n${content}\n\`\`\``,
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
                    
                    // Extract code blocks from the fix
                    const codeBlockRegex = /```(?:[\w]*)\n([\s\S]*?)```/g;
                    const matches = [...fix.matchAll(codeBlockRegex)];
                    
                    if (matches.length > 0) {
                        // Use the last code block as the fix
                        const fixedCode = matches[matches.length - 1][1];
                        
                        // Create a backup of the original file
                        const backupPath = `${filePath}.bak`;
                        fs.copyFileSync(filePath, backupPath);
                        
                        // Apply the fix
                        fs.writeFileSync(filePath, fixedCode);
                        
                        fixedIssues.push({
                            issue,
                            fix,
                            backupPath
                        });
                        
                        console.log(`✅ Fixed issue in ${filePath}: ${issue.message}`);
                    }
                } catch (error) {
                    console.error(`Error fixing issue in ${issue.file}:`, error);
                }
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
        console.error('Error in scanCodebase:', error);
        next(error);
    }
};

// Register routes with middleware
router.post('/scan', authorize(['read']), scanCodebase);

export const monitorRouter = router;