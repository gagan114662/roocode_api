import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import tasksRouter from '../tasks';
import BoomerangService from '../../services/boomerang/BoomerangService';

jest.mock('../../services/boomerang/BoomerangService');

describe('Tasks Routes', () => {
    let app: express.Application;

    beforeEach(() => {
        jest.resetAllMocks();
        app = express();
        app.use(express.json());
        app.use('/tasks', tasksRouter);
    });

    describe('GET /tasks', () => {
        it('should return list of tasks', async () => {
            const mockTasks = [
                {
                    name: "Weekly Update",
                    schedule: "0 3 * * 1",
                    endpoint: "/projects/{{projectId}}/update-deps",
                    enabled: true
                }
            ];

            (BoomerangService.prototype.listTasks as jest.Mock).mockResolvedValue(mockTasks);

            const response = await request(app)
                .get('/tasks')
                .expect(200);

            expect(response.body).toEqual({ tasks: mockTasks });
        });

        it('should handle errors', async () => {
            (BoomerangService.prototype.listTasks as jest.Mock)
                .mockRejectedValue(new Error('Failed to read tasks'));

            await request(app)
                .get('/tasks')
                .expect(500);
        });
    });

    describe('POST /tasks/:name/enable', () => {
        it('should enable task', async () => {
            const response = await request(app)
                .post('/tasks/Weekly%20Update/enable')
                .expect(200);

            expect(response.body).toEqual({
                status: 'enabled',
                name: 'Weekly Update'
            });
            expect(BoomerangService.prototype.setTaskEnabled)
                .toHaveBeenCalledWith('Weekly Update', true);
        });

        it('should return 404 for non-existent task', async () => {
            (BoomerangService.prototype.setTaskEnabled as jest.Mock)
                .mockRejectedValue(new Error('Task not found: Invalid Task'));

            const response = await request(app)
                .post('/tasks/Invalid%20Task/enable')
                .expect(404);

            expect(response.body).toEqual({
                error: 'Task not found: Invalid Task'
            });
        });
    });

    describe('POST /tasks/:name/disable', () => {
        it('should disable task', async () => {
            const response = await request(app)
                .post('/tasks/Weekly%20Update/disable')
                .expect(200);

            expect(response.body).toEqual({
                status: 'disabled',
                name: 'Weekly Update'
            });
            expect(BoomerangService.prototype.setTaskEnabled)
                .toHaveBeenCalledWith('Weekly Update', false);
        });

        it('should return 404 for non-existent task', async () => {
            (BoomerangService.prototype.setTaskEnabled as jest.Mock)
                .mockRejectedValue(new Error('Task not found: Invalid Task'));

            const response = await request(app)
                .post('/tasks/Invalid%20Task/disable')
                .expect(404);

            expect(response.body).toEqual({
                error: 'Task not found: Invalid Task'
            });
        });
    });
});
