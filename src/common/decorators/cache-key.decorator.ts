import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY_METADATA = 'cache_key';

export interface CacheKeyOptions {
  key?: string;
  prefix?: string;
  includeParams?: boolean;
}

export const CacheKey = (key: string | CacheKeyOptions) => {
  if (typeof key === 'string') {
    return SetMetadata(CACHE_KEY_METADATA, { key, includeParams: true });
  }
  return SetMetadata(CACHE_KEY_METADATA, { ...key, includeParams: key.includeParams ?? true });
};

// Convenience decorators for different cache durations
export const CacheKeyShort = (key: string) => CacheKey({ key, prefix: 'short' });
export const CacheKeyMedium = (key: string) => CacheKey({ key, prefix: 'medium' });
export const CacheKeyLong = (key: string) => CacheKey({ key, prefix: 'long' });

