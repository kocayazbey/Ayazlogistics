import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions, Pipeline } from 'ioredis';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    const options: RedisOptions = {
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB', 0),
      keyPrefix: this.configService.get('REDIS_KEY_PREFIX', 'ayaz:'),
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    };

    this.client = new Redis(options);

    this.client.on('error', (err) => {
      this.logger.error('Redis error', err as any);
    });
  }

  async connect(): Promise<void> {
    if (this.client.status === 'end' || this.client.status === 'wait') {
      await this.client.connect();
      this.logger.log('Redis connected');
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string): Promise<'OK' | null> {
    return this.client.set(key, value);
  }

  async setex(key: string, ttlSeconds: number, value: string): Promise<'OK' | null> {
    return this.client.setex(key, ttlSeconds, value);
  }

  async del(...keys: string[]): Promise<number> {
    return this.client.del(...keys);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  async mget(...keys: string[]): Promise<(string | null)[]> {
    return this.client.mget(...keys);
  }

  pipeline(): Pipeline {
    return this.client.pipeline();
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async sadd(key: string, member: string): Promise<number> {
    return this.client.sadd(key, member);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }

  async info(section?: string): Promise<string> {
    return this.client.info(section);
  }

  async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }
}
