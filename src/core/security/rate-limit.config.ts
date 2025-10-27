import { registerAs } from '@nestjs/config';

export default registerAs('ratelimit', () => ({
  default: {
    points: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    duration: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
    blockDuration: parseInt(process.env.RATE_LIMIT_BLOCK_TTL || '0', 10),
    keyPrefix: process.env.RATE_LIMIT_PREFIX || 'ratelimit',
  },
}));
