import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import BoomerangService from '../boomerang/BoomerangService';

jest.mock('fs/promises');

describe('BoomerangService', () => {
    const mockYaml = {
        tasks: [
            {
                name: "Weekly Update",
                schedule: "0 3 * * 1",
                endpoint: "/projects/{{projectId}}/update-deps"
            }
        ]
    };

    beforeEach(() => {
        jest.resetAllMocks();
        (fs.readFile as jest.Mock).mockResolvedValue(yaml.dump(mockYaml));
    });

    describe('listTasks', () => {
        it('should return array of tasks from yaml file', async () => {
            const service = new BoomerangService();
            const tasks = await service.listTasks();

            expect(tasks).toHaveLength(1);
            expect(tasks[0]).toEqual({
                name: "Weekly Update",
                schedule: "0 3 * * 1",
                endpoint: "/projects/{{projectId}}/update-deps"
            });
        });

        it('should return empty array if file does not exist', async () => {
            (fs.readFile as jest.Mock).mockRejectedValue({ code: 'ENOENT' });
            
            const service = new BoomerangService();
            const tasks = await service.listTasks();

            expect(tasks).toEqual([]);
        });

        it('should throw other errors', async () => {
            const error = new Error('Permission denied');
            (fs.readFile as jest.Mock).mockRejectedValue(error);
            
            const service = new BoomerangService();
            await expect(service.listTasks()).rejects.toThrow(error);
        });
    });

    describe('setTaskEnabled', () => {
        it('should update task enabled status in yaml file', async () => {
            const service = new BoomerangService();
            await service.setTaskEnabled('Weekly Update', false);

            expect(fs.writeFile).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining('enabled: false')
            );
        });

        it('should throw error if task not found', async () => {
            const service = new BoomerangService();
            await expect(service.setTaskEnabled('Non-existent Task', true))
                .rejects.toThrow('Task not found: Non-existent Task');
        });
    });
});
