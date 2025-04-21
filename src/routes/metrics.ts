import { Router } from 'express';
import { register } from 'prom-client';

const router = Router();

// Expose metrics endpoint for Prometheus
router.get('/metrics', async (req, res) => {
    try {
        // Enable collection of default metrics
        register.setDefaultLabels({
            app: 'roocode-api'
        });

        const metrics = await register.metrics();
        
        res.set('Content-Type', register.contentType);
        res.end(metrics);
    } catch (error) {
        console.error('Error collecting metrics:', error);
        res.status(500).end();
    }
});

// Expose health check with basic metrics
router.get('/health', async (req, res) => {
    try {
        const jobQueueMetrics = await register.getSingleMetricAsJSON('roocode_jobs_enqueued_total');
        const failureMetrics = await register.getSingleMetricAsJSON('roocode_jobs_failed_total');

        res.json({
            status: 'healthy',
            metrics: {
                jobsEnqueued: jobQueueMetrics,
                jobsFailed: failureMetrics
            }
        });
    } catch (error) {
        console.error('Error getting health metrics:', error);
        res.status(500).json({ status: 'error', message: 'Error getting metrics' });
    }
});

export const metricsRouter = router;