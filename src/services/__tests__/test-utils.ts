import type { Redis } from 'ioredis';
import IORedis from 'ioredis';

export class TestRedis {
  private static instance: Redis | null = null;

  static async getInstance(): Promise<Redis> {
    if (!this.instance) {
      const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true
      });

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        redis.on('ready', () => resolve());
        redis.on('error', (error) => reject(error));
      });

      this.instance = redis;
    }
    return this.instance;
  }

  static async cleanup(): Promise<void> {
    if (this.instance) {
      await this.instance.flushall();
      await this.instance.quit();
      this.instance = null;
    }
  }
}

export async function setupTestDb(): Promise<Redis> {
  const redis = await TestRedis.getInstance();
  await redis.flushall(); // Clear all data
  return redis;
}

export async function cleanupTestDb(): Promise<void> {
  await TestRedis.cleanup();
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}