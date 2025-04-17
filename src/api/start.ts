import { startServer } from './server';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Start the API server
try {
    const server = startServer();
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
        console.log('Received SIGTERM. Performing graceful shutdown...');
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    });

    process.on('SIGINT', () => {
        console.log('Received SIGINT. Performing graceful shutdown...');
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    });

} catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
}