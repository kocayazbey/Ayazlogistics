import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';

export const StrictRateLimit = () => SetMetadata(RATE_LIMIT_KEY, { ttl: 900000, limit: 5 });
export const StandardRateLimit = () => SetMetadata(RATE_LIMIT_KEY, { ttl: 900000, limit: 100 });
export const SearchRateLimit = () => SetMetadata(RATE_LIMIT_KEY, { ttl: 60000, limit: 30 });