import { SetMetadata } from '@nestjs/common';

export interface RateLimitOptions {
  points?: number;
  duration?: number;
  blockDuration?: number;
  keyPrefix?: string;
}

export const RATE_LIMIT_KEY = 'rate_limit_options';
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

/**
 * Predefined rate limit decorators for different use cases
 */
export const RateLimitAPI = (requests: number = 100, windowMs: number = 15 * 60 * 1000) =>
  RateLimit({ requests, windowMs, message: 'Too many API requests' });

export const RateLimitAuth = (requests: number = 5, windowMs: number = 15 * 60 * 1000) =>
  RateLimit({ requests, windowMs, message: 'Too many authentication attempts' });

export const RateLimitSearch = (requests: number = 30, windowMs: number = 60 * 1000) =>
  RateLimit({ requests, windowMs, message: 'Too many search requests' });

export const RateLimitUpload = (requests: number = 10, windowMs: number = 60 * 1000) =>
  RateLimit({ requests, windowMs, message: 'Too many upload requests' });

export const RateLimitStrict = (requests: number = 5, windowMs: number = 60 * 1000) =>
  RateLimit({ requests, windowMs, message: 'Rate limit exceeded' });

export const RateLimitBurst = (requests: number = 20, windowMs: number = 10 * 1000) =>
  RateLimit({ requests, windowMs, message: 'Burst rate limit exceeded' });

export const RateLimitGlobal = (requests: number = 1000, windowMs: number = 60 * 1000) =>
  RateLimit({ requests, windowMs, message: 'Global rate limit exceeded' });
