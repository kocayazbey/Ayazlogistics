import { SetMetadata } from '@nestjs/common';
import { RetryConfig } from '../services/retry.service';

export const RETRY_KEY = 'retry';

export const Retry = (config?: Partial<RetryConfig>) =>
  SetMetadata(RETRY_KEY, config || {});

export const RetryOnce = () =>
  Retry({ maxAttempts: 2, delay: 1000 });

export const RetryThrice = () =>
  Retry({ maxAttempts: 4, delay: 1000, backoffMultiplier: 2 });

export const RetryWithBackoff = () =>
  Retry({ 
    maxAttempts: 5, 
    delay: 1000, 
    backoffMultiplier: 2, 
    maxDelay: 10000,
    jitter: true 
  });

export const RetryFast = () =>
  Retry({ maxAttempts: 3, delay: 500, backoffMultiplier: 1.5 });

export const RetrySlow = () =>
  Retry({ maxAttempts: 5, delay: 2000, backoffMultiplier: 2, maxDelay: 30000 });
