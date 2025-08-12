// ================================================================
// src/utils/retryPolicy.ts
// ================================================================

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

export class RetryPolicy {
  constructor(private config: RetryConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<RetryResult<T>> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        return {
          success: true,
          result,
          attempts: attempt,
          totalTime: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        console.log(`Attempt ${attempt}/${this.config.maxAttempts} failed:`, lastError.message);

        if (attempt < this.config.maxAttempts) {
          const delay = this.calculateDelay(attempt);
          console.log(`Retrying in ${delay}ms...`);
          await this.delay(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError || new Error('Unknown error'),
      attempts: this.config.maxAttempts,
      totalTime: Date.now() - startTime,
    };
  }

  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelay);

    if (this.config.jitter) {
      // Add random jitter up to 25% of the delay
      const jitterAmount = cappedDelay * 0.25 * Math.random();
      return Math.floor(cappedDelay + jitterAmount);
    }

    return cappedDelay;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}