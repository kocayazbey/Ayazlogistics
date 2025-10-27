import axios, { AxiosError } from 'axios';

export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
}

export async function withRetry<T>(fn: () => Promise<T>, policy: RetryPolicy): Promise<T> {
  let attempt = 0;
  // jittered exponential backoff
  while (true) {
    try {
      return await fn();
    } catch (e) {
      attempt++;
      const isRetryable = e instanceof AxiosError ? (!e.response || e.response.status >= 500) : true;
      if (!isRetryable || attempt > policy.maxRetries) throw e;
      const delay = policy.baseDelayMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 250);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
