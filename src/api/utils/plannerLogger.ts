import { CompactLogger } from '../../utils/logging/CompactLogger';
import { CompactTransport } from '../../utils/logging/CompactTransport';

// Create a transport instance specifically for the planner
const plannerTransport = new CompactTransport({
    level: 'debug',
    fileOutput: {
        enabled: true,
        path: './logs/planner.log'
    }
});

// Create a logger instance for the planner with context
export const plannerLogger = new CompactLogger(plannerTransport, { ctx: 'planner' });