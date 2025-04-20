import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface TaskConfig {
    name: string;
    schedule: string;
    endpoint: string;
    enabled?: boolean;  // treat missing as true
}

export class BoomerangService {
    private configPath: string;

    constructor(configPath = '.boomerang.yaml') {
        this.configPath = path.resolve(process.cwd(), configPath);
    }

    async listTasks(): Promise<TaskConfig[]> {
        try {
            const content = await fs.readFile(this.configPath, 'utf8');
            const config = yaml.load(content) as { tasks: TaskConfig[] };
            return config.tasks || [];
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
                return [];
            }
            throw err;
        }
    }

    async setTaskEnabled(name: string, enabled: boolean): Promise<void> {
        const content = await fs.readFile(this.configPath, 'utf8');
        const config = yaml.load(content) as { tasks: TaskConfig[] };
        
        const taskIndex = config.tasks.findIndex(t => t.name === name);
        if (taskIndex === -1) {
            throw new Error(`Task not found: ${name}`);
        }

        config.tasks[taskIndex].enabled = enabled;
        await fs.writeFile(this.configPath, yaml.dump(config));
    }
}

export default BoomerangService;
