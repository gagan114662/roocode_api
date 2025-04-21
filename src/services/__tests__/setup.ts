import { jest, expect, beforeAll, afterAll } from '@jest/globals';
import dotenv from 'dotenv';
import { TestRedis } from './test-utils';

// Load environment variables from .env.test if it exists
dotenv.config({ path: '.env.test' });

// Store original environment variables
const originalEnv = {
  REDIS_URL: process.env.REDIS_URL,
  NODE_ENV: process.env.NODE_ENV
};

// Set default test environment variables if not already set
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379';
}
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Global test setup
beforeAll(async () => {
  try {
    // Initialize test database
    const redis = await TestRedis.getInstance();
    
    // Clear all data
    await redis.flushall();

    console.log('Test environment initialized with Redis at:', process.env.REDIS_URL);
  } catch (error) {
    console.error('Failed to initialize test environment:', error);
    throw error;
  }
}, 30000); // 30s timeout for initial setup

// Global test teardown
afterAll(async () => {
  try {
    await TestRedis.cleanup();
    console.log('Test environment cleaned up');
  } catch (error) {
    console.error('Failed to clean up test environment:', error);
    throw error;
  }
}, 30000); // 30s timeout for cleanup

// Set default test timeout
jest.setTimeout(30000); // 30s timeout for all tests

// Add global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Fail the test
  throw reason;
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Fail the test
  throw error;
});

// Log Redis connection errors
process.on('redis:error', (error) => {
  console.error('Redis Error:', error);
  // Fail the test
  throw error;
});

// Define custom matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Add custom matcher types
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}

// Ensure environment variables are typed
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'test' | 'development' | 'production';
      REDIS_URL: string;
    }
  }
}

// Export environment initialization functions
export function resetEnv() {
  process.env.REDIS_URL = originalEnv.REDIS_URL || 'redis://localhost:6379';
  process.env.NODE_ENV = originalEnv.NODE_ENV || 'test';
}

export function clearEnv() {
  process.env.REDIS_URL = originalEnv.REDIS_URL || '';
  process.env.NODE_ENV = originalEnv.NODE_ENV || '';
}