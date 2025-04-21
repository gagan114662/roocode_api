export class RetryOptions {
  maxRetries: number = 3;
  initialDelay: number = 1000; // 1 second
  maxDelay: number = 10000; // 10 seconds
  factor: number = 2;
}

export async function exponentialBackoff<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...new RetryOptions(), ...options };
  let lastError = new Error('Operation failed');
  let currentDelay = config.initialDelay;

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === config.maxRetries - 1) {
        break;
      }

      // Calculate next delay with exponential backoff
      currentDelay = Math.min(
        currentDelay * config.factor,
        config.maxDelay
      );

      // Add some jitter to prevent thundering herd
      const jitter = Math.random() * 100;
      await sleep(currentDelay + jitter);
    }
  }

  throw new Error(`Operation failed after ${config.maxRetries} attempts: ${lastError.message}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> {
  return exponentialBackoff(operation, options);
}