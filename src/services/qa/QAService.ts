import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

export interface QAResult {
  command: string;
  success: boolean;
  output: string;
  error?: string;
}

/**
 * QAService provides immediate feedback on code quality and correctness
 * by running various checks like TypeScript compilation, tests, and linting.
 */
export class QAService {
  private static instance: QAService;
  
  private constructor() {}
  
  /**
   * Get the singleton instance of QAService
   */
  public static getInstance(): QAService {
    if (!QAService.instance) {
      QAService.instance = new QAService();
    }
    return QAService.instance;
  }
  
  /**
   * Run TypeScript compilation check
   * @param projectPath Path to the project
   * @returns QA result with compilation output
   */
  public async runTypeCheck(projectPath: string): Promise<QAResult> {
    try {
      // Check if tsconfig.json exists
      const tsconfigPath = path.join(projectPath, 'tsconfig.json');
      try {
        await fs.access(tsconfigPath);
      } catch (error) {
        return {
          command: 'tsc --noEmit',
          success: false,
          output: 'TypeScript configuration not found',
          error: 'tsconfig.json not found'
        };
      }
      
      // Run TypeScript compilation check
      const { stdout, stderr } = await execAsync('npx tsc --noEmit', { cwd: projectPath });
      
      return {
        command: 'tsc --noEmit',
        success: !stderr,
        output: stdout || 'TypeScript compilation successful',
        error: stderr || undefined
      };
    } catch (error) {
      return {
        command: 'tsc --noEmit',
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Run tests
   * @param projectPath Path to the project
   * @returns QA result with test output
   */
  public async runTests(projectPath: string): Promise<QAResult> {
    try {
      // Check if package.json exists and has test script
      const packageJsonPath = path.join(projectPath, 'package.json');
      let hasTestScript = false;
      
      try {
        const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(packageJsonContent);
        hasTestScript = packageJson.scripts && packageJson.scripts.test;
      } catch (error) {
        return {
          command: 'npm test',
          success: false,
          output: 'package.json not found or invalid',
          error: 'Cannot run tests without package.json'
        };
      }
      
      if (!hasTestScript) {
        return {
          command: 'npm test',
          success: false,
          output: 'No test script found in package.json',
          error: 'Add a test script to package.json'
        };
      }
      
      // Run tests
      const { stdout, stderr } = await execAsync('npm test -- --silent', { cwd: projectPath });
      
      // npm test returns success even if tests fail, so we need to check the output
      const success = !stderr && !stdout.includes('FAIL');
      
      return {
        command: 'npm test',
        success,
        output: stdout,
        error: stderr || undefined
      };
    } catch (error) {
      return {
        command: 'npm test',
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Run ESLint with auto-fix
   * @param projectPath Path to the project
   * @returns QA result with linting output
   */
  public async runLint(projectPath: string): Promise<QAResult> {
    try {
      // Check if eslint is configured
      const eslintConfigFiles = [
        '.eslintrc.js',
        '.eslintrc.json',
        '.eslintrc.yml',
        '.eslintrc.yaml',
        '.eslintrc',
        'package.json'
      ];
      
      let hasEslintConfig = false;
      for (const configFile of eslintConfigFiles) {
        try {
          await fs.access(path.join(projectPath, configFile));
          hasEslintConfig = true;
          break;
        } catch (error) {
          // Config file not found, continue checking
        }
      }
      
      if (!hasEslintConfig) {
        return {
          command: 'eslint --fix',
          success: false,
          output: 'ESLint configuration not found',
          error: 'Add an ESLint configuration file'
        };
      }
      
      // Run ESLint with auto-fix
      const { stdout, stderr } = await execAsync('npx eslint . --fix', { cwd: projectPath });
      
      return {
        command: 'eslint --fix',
        success: !stderr,
        output: stdout || 'ESLint ran successfully',
        error: stderr || undefined
      };
    } catch (error) {
      return {
        command: 'eslint --fix',
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Run all QA checks
   * @param projectPath Path to the project
   * @returns Array of QA results
   */
  public async runAll(projectPath: string): Promise<QAResult[]> {
    const results: QAResult[] = [];
    
    // Run TypeScript compilation check
    results.push(await this.runTypeCheck(projectPath));
    
    // Run tests
    results.push(await this.runTests(projectPath));
    
    // Run ESLint
    results.push(await this.runLint(projectPath));
    
    return results;
  }
  
  /**
   * Install dependencies
   * @param projectPath Path to the project
   * @returns QA result with installation output
   */
  public async installDependencies(projectPath: string): Promise<QAResult> {
    try {
      // Check if package.json exists
      const packageJsonPath = path.join(projectPath, 'package.json');
      try {
        await fs.access(packageJsonPath);
      } catch (error) {
        return {
          command: 'npm ci',
          success: false,
          output: 'package.json not found',
          error: 'Cannot install dependencies without package.json'
        };
      }
      
      // Install dependencies
      const { stdout, stderr } = await execAsync('npm ci', { cwd: projectPath });
      
      return {
        command: 'npm ci',
        success: !stderr,
        output: stdout,
        error: stderr || undefined
      };
    } catch (error) {
      return {
        command: 'npm ci',
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

export const qaService = QAService.getInstance();