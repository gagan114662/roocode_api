import { Router } from 'express';
import BoomerangService from '../services/boomerang/BoomerangService';

const router = Router();
const boomerang = new BoomerangService();

router.get('/', async (req, res, next) => {
    try {
        const tasks = await boomerang.listTasks();
        res.json({ tasks });
    } catch (err) {
        next(err);
    }
});

router.post('/:name/enable', async (req, res, next) => {
    try {
        await boomerang.setTaskEnabled(req.params.name, true);
        res.json({ status: 'enabled', name: req.params.name });
    } catch (err) {
        if (err instanceof Error && err.message.startsWith('Task not found:')) {
            res.status(404).json({ error: err.message });
            return;
        }
        next(err);
    }
});

router.post('/:name/disable', async (req, res, next) => {
    try {
        await boomerang.setTaskEnabled(req.params.name, false);
        res.json({ status: 'disabled', name: req.params.name });
    } catch (err) {
        if (err instanceof Error && err.message.startsWith('Task not found:')) {
            res.status(404).json({ error: err.message });
            return;
        }
        next(err);
    }
});

export default router;
