import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

interface ProjectStructure {
  directories: string[];
  files: {
    path: string;
    description: string;
  }[];
}

interface Plan {
  components: Component[];
  implementationOrder: string[];
  projectStructure: ProjectStructure;
}

interface PlanResponse {
  plan: Plan;
  planPath: string;
  timestamp: string;
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

interface FixedIssue {
  issue: Issue;
  fix: string;
}

/**
 * WorkflowService orchestrates the entire project lifecycle:
 * 1. Planning: Breaking down requirements into components
 * 2. Implementation: Building components in the correct order
 * 3. Testing: Generating and running tests for each component
 * 4. Monitoring: Continuously checking for issues and fixing them
 */
export class WorkflowService {
  private apiBaseUrl: string;
  private apiKey: string;
  private projectRoot: string;
  private currentPlanPath: string | null = null;
  private implementedComponents: Set<string> = new Set();
  private componentDependencies: Map<string, string[]> = new Map();
  private implementationOrder: string[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.apiBaseUrl = 'http://localhost:3000/api/v1';
    this.apiKey = process.env.API_KEY || 'test-key';
    this.projectRoot = process.cwd();
  }

  /**
   * Start a new project workflow
   * @param requirements Project requirements
   * @param projectType Type of project (web, mobile, backend, etc.)
   * @param projectDir Directory to create the project in
   */
  async startProject(requirements: string, projectType: string, projectDir: string): Promise<any> {
    try {
      // Create project directory if it doesn't exist
      const fullProjectPath = path.join(this.projectRoot, projectDir);
      if (!fs.existsSync(fullProjectPath)) {
        fs.mkdirSync(fullProjectPath, { recursive: true });
      }

      // Step 1: Generate project plan
      console.log('🚀 Starting project planning phase...');
      const plan = await this.generatePlan(requirements, projectType);
      this.currentPlanPath = plan.planPath;
      
      // Extract implementation order and dependencies
      this.implementationOrder = plan.plan.implementationOrder;
      plan.plan.components.forEach((component: Component) => {
        this.componentDependencies.set(component.name, component.dependencies);
      });

      // Step 2: Create project structure
      console.log('📁 Creating project structure...');
      await this.createProjectStructure(plan.plan.projectStructure, fullProjectPath);

      // Step 3: Implement components in order
      console.log('🔨 Starting implementation phase...');
      await this.implementComponentsInOrder(fullProjectPath);

      // Step 4: Start continuous monitoring
      console.log('🔍 Starting continuous monitoring...');
      this.startContinuousMonitoring(fullProjectPath);

      return {
        status: 'success',
        message: 'Project workflow started successfully',
        plan: plan.plan,
        projectPath: fullProjectPath
      };
    } catch (error) {
      console.error('Error in workflow:', error);
      throw error;
    }
  }

  /**
   * Generate a project plan from requirements
   */
  private async generatePlan(requirements: string, projectType: string): Promise<PlanResponse> {
    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/planner/generate`,
        {
          requirements,
          projectType,
          context: `Create a comprehensive plan for a ${projectType} project.`
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey
          }
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Error generating plan:', error);
      throw error;
    }
  }

  /**
   * Create the project structure based on the plan
   */
  private async createProjectStructure(
    projectStructure: ProjectStructure,
    projectRoot: string
  ): Promise<void> {
    // Create directories
    for (const dir of projectStructure.directories) {
      const fullPath = path.join(projectRoot, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }

    // Create placeholder files
    for (const file of projectStructure.files) {
      const fullPath = path.join(projectRoot, file.path);
      const dirName = path.dirname(fullPath);
      
      if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
      }
      
      if (!fs.existsSync(fullPath)) {
        fs.writeFileSync(fullPath, `// ${file.description}\n// This file will be implemented by the system\n`);
      }
    }
  }

  /**
   * Implement components in the correct order
   */
  private async implementComponentsInOrder(projectRoot: string): Promise<void> {
    if (!this.currentPlanPath) {
      throw new Error('No plan has been generated yet');
    }

    // Implement components in order
    for (const componentName of this.implementationOrder) {
      // Check if all dependencies are implemented
      const dependencies = this.componentDependencies.get(componentName) || [];
      const allDependenciesImplemented = dependencies.every(dep => 
        this.implementedComponents.has(dep)
      );

      if (!allDependenciesImplemented) {
        console.warn(`Skipping ${componentName} as not all dependencies are implemented yet`);
        continue;
      }

      console.log(`Implementing component: ${componentName}`);
      
      try {
        // Implement the component
        const response = await axios.post(
          `${this.apiBaseUrl}/implementation/implement`,
          {
            planPath: this.currentPlanPath,
            componentName,
            context: `Implement this component for the project at ${projectRoot}. Use modern coding practices.`
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': this.apiKey
            }
          }
        );

        // Mark component as implemented
        this.implementedComponents.add(componentName);
        
        // Generate tests for the component
        await this.generateTestsForComponent(componentName, projectRoot);
        
        console.log(`✅ Component ${componentName} implemented and tested successfully`);
      } catch (error) {
        console.error(`Error implementing component ${componentName}:`, error);
        // Continue with next component even if this one fails
      }
    }
  }

  /**
   * Generate tests for a component
   */
  private async generateTestsForComponent(componentName: string, projectRoot: string): Promise<void> {
    // Find files related to this component
    const files = fs.readdirSync(projectRoot, { recursive: true }) as string[];
    const componentFiles = files.filter(file => 
      typeof file === 'string' && 
      file.toLowerCase().includes(componentName.toLowerCase().replace(/\s+/g, '-'))
    );

    for (const file of componentFiles) {
      if (typeof file !== 'string') continue;
      
      const fullPath = path.join(projectRoot, file);
      if (!fs.statSync(fullPath).isFile()) continue;

      try {
        console.log(`Generating tests for file: ${file}`);
        
        // Generate tests
        const response = await axios.post(
          `${this.apiBaseUrl}/implementation/test`,
          {
            filePath: fullPath,
            context: `Generate comprehensive tests for this component of the project.`
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': this.apiKey
            }
          }
        );

        console.log(`✅ Tests generated for ${file}`);
      } catch (error) {
        console.error(`Error generating tests for ${file}:`, error);
      }
    }
  }

  /**
   * Start continuous monitoring of the project
   */
  private startContinuousMonitoring(projectRoot: string): void {
    // Run initial scan
    this.scanProject(projectRoot);

    // Set up interval for continuous monitoring
    this.monitoringInterval = setInterval(() => {
      this.scanProject(projectRoot);
    }, 5 * 60 * 1000); // Scan every 5 minutes
  }

  /**
   * Scan project for issues
   */
  private async scanProject(projectRoot: string): Promise<void> {
    try {
      console.log(`🔍 Scanning project at ${projectRoot} for issues...`);
      
      const response = await axios.post(
        `${this.apiBaseUrl}/monitor/scan`,
        {
          directory: projectRoot,
          scanType: 'all'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey
          }
        }
      );

      const { issues, fixedIssues } = response.data.data;
      
      console.log(`Found ${issues.length} issues, fixed ${fixedIssues?.length || 0} automatically`);
      
      // For issues that weren't fixed automatically, try to fix them
      const unfixedIssues = issues.filter((issue: Issue) => 
        !fixedIssues?.some((fixed: FixedIssue) => fixed.issue.file === issue.file && fixed.issue.message === issue.message)
      );
      
      if (unfixedIssues.length > 0) {
        console.log(`Attempting to fix ${unfixedIssues.length} remaining issues...`);
        await this.fixIssues(unfixedIssues, projectRoot);
      }
    } catch (error) {
      console.error('Error scanning project:', error);
    }
  }

  /**
   * Fix issues in the project
   */
  private async fixIssues(issues: Issue[], projectRoot: string): Promise<void> {
    for (const issue of issues) {
      try {
        // Get file content
        const filePath = issue.file;
        if (!fs.existsSync(filePath)) continue;
        
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Get fix from chat service
        const response = await axios.post(
          `${this.apiBaseUrl}/chat/message`,
          {
            message: `Fix this issue in file ${filePath}:\n${issue.message}\n\nHere's the code:\n\`\`\`\n${content}\n\`\`\``,
            mode: 'debug'
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': this.apiKey
            }
          }
        );
        
        const fix = response.data.data.response;
        
        // Extract code blocks from the fix
        const codeBlockRegex = /```(?:[\w]*)\n([\s\S]*?)```/g;
        const matches = [...fix.matchAll(codeBlockRegex)];
        
        if (matches.length > 0) {
          // Use the last code block as the fix
          const fixedCode = matches[matches.length - 1][1];
          
          // Apply the fix
          fs.writeFileSync(filePath, fixedCode);
          console.log(`✅ Fixed issue in ${filePath}: ${issue.message}`);
        }
      } catch (error) {
        console.error(`Error fixing issue in ${issue.file}:`, error);
      }
    }
  }

  /**
   * Stop the workflow
   */
  stopWorkflow(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log('Workflow stopped');
  }
}

// Export as singleton
export const workflowService = new WorkflowService();