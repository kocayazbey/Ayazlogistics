import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EnhancedCacheService } from './enhanced-cache.service';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [EnhancedCacheService, RedisService],
  exports: [EnhancedCacheService, RedisService],
})
export class CacheModule {}