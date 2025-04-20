import EventEmitter from 'events';
import { Task, TaskResult } from '../types/project';
import { modes, ModeType } from '../services/modes-config';
import { openaiService } from '../services/openai-service';
import { workspaceManager } from './workspace';
import { GitService } from '../services/git-service';
import { fileService } from '../services/file-service';
import path from 'path';

export interface TaskContext {
  projectId: string;
  workspacePath: string;
  git: GitService;
}

export interface TaskExecutionState {
  currentTask?: Task;
  completedTasks: Task[];
  results: TaskResult[];
  failed: boolean;
  error?: string;
}

export class TaskExecutor extends EventEmitter {
  private static instance: TaskExecutor;
  private state: Map<string, TaskExecutionState>;

  private constructor() {
    super();
    this.state = new Map();
  }

  public static getInstance(): TaskExecutor {
    if (!TaskExecutor.instance) {
      TaskExecutor.instance = new TaskExecutor();
    }
    return TaskExecutor.instance;
  }

  public async executeTasks(projectId: string, tasks: Task[]): Promise<TaskResult[]> {
    // Initialize execution state
    this.initializeState(projectId);
    const state = this.getState(projectId);

    // Validate workspace
    if (!await workspaceManager.validate(projectId)) {
      throw new Error('Invalid workspace');
    }

    const context: TaskContext = {
      projectId,
      workspacePath: workspaceManager.getWorkspacePath(projectId),
      git: new GitService(workspaceManager.getWorkspacePath(projectId))
    };

    try {
      for (const task of tasks) {
        // Update state
        state.currentTask = task;
        this.emit('taskStart', { projectId, task });

        // Execute task
        const result = await this.executeTask(task, context);
        state.results.push(result);
        state.completedTasks.push(task);

        // Emit progress
        this.emit('taskComplete', { projectId, task, result });

        if (result.status === 'failed') {
          state.failed = true;
          state.error = result.error;
          break;
        }
      }

      return state.results;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      state.failed = true;
      state.error = errorMessage;
      this.emit('error', { projectId, error: errorMessage });
      throw error;
    }
  }

  private async executeTask(task: Task, context: TaskContext): Promise<TaskResult> {
    const modeKey = task.ownerMode.toLowerCase() as ModeType;
    const modeConfig = modes[modeKey];

    if (!modeConfig) {
      throw new Error(`Invalid mode: ${task.ownerMode}`);
    }

    const currentTask: TaskResult = {
      taskId: task.id,
      status: 'in_progress',
      output: 'Task execution in progress'
    };

    try {
      // Generate content
      const prompt = modeConfig.promptTemplate.replace('{{description}}', task.description);
      const completion = await openaiService.chatCompletion(prompt);

      if (!completion.success || !completion.data) {
        throw new Error(completion.error?.message || 'Failed to execute task');
      }

      // Process output based on mode
      await this.processOutput(completion.data, task, context);

      // Update task result
      return {
        ...currentTask,
        status: 'completed',
        output: completion.data
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        ...currentTask,
        status: 'failed',
        output: '',
        error: errorMessage
      };
    }
  }

  private async processOutput(output: string, task: Task, context: TaskContext): Promise<void> {
    const { git, workspacePath } = context;
    const modeKey = task.ownerMode.toLowerCase() as ModeType;

    if (modeKey === ModeType.CODE || modeKey === ModeType.DEBUG) {
      // Extract and save code files
      const files = this.parseCodeBlocks(output);
      for (const file of files) {
        const filePath = path.join(workspacePath, file.path);
        await fileService.writeFile(filePath, file.content);
        await git.stage(file.path);
      }
    } else {
      // Save non-code output as markdown
      const fileName = `docs/${task.id}-${task.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
      const filePath = path.join(workspacePath, fileName);
      await fileService.writeFile(filePath, output);
      await git.stage(fileName);
    }

    // Commit changes if there are any
    const hasChanges = await git.hasChanges();
    if (hasChanges) {
      await git.commit(`Task ${task.id}: ${task.title}`);
    }
  }

  private parseCodeBlocks(content: string): Array<{ path: string; content: string }> {
    const files: Array<{ path: string; content: string }> = [];
    const fileRegex = /```(\w+)\s*([^\n]+)\n([\s\S]+?)```/g;
    
    let match;
    while ((match = fileRegex.exec(content)) !== null) {
      const [_, lang, filePath, fileContent] = match;
      files.push({
        path: filePath.trim(),
        content: fileContent.trim()
      });
    }

    if (files.length === 0) {
      throw new Error('No code blocks found in response');
    }

    return files;
  }

  private initializeState(projectId: string): void {
    this.state.set(projectId, {
      completedTasks: [],
      results: [],
      failed: false
    });
  }

  private getState(projectId: string): TaskExecutionState {
    const state = this.state.get(projectId);
    if (!state) {
      throw new Error('Task execution state not initialized');
    }
    return state;
  }
}

export const taskExecutor = TaskExecutor.getInstance();