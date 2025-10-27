import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SecurityService } from './security.service';
import { EncryptionService } from './encryption.service';
import { RateLimitService } from './rate-limit.service';
import { SecurityGuard } from './security.guard';
import { InputValidationPipe } from './input-validation.pipe';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysScheduler } from './api-keys.scheduler';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [ApiKeysController],
  providers: [
    SecurityService,
    EncryptionService,
    RateLimitService,
    SecurityGuard,
    InputValidationPipe,
    ApiKeysService,
    ApiKeysScheduler,
  ],
  exports: [
    SecurityService,
    EncryptionService,
    RateLimitService,
    SecurityGuard,
    InputValidationPipe,
    ApiKeysService,
  ],
})
export class SecurityModule {}