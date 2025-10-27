import { Module } from '@nestjs/common';
import { ObservabilitySecurityController } from './observability-security.controller';
import { ObservabilitySecurityService } from './observability-security.service';

@Module({
  controllers: [ObservabilitySecurityController],
  providers: [ObservabilitySecurityService],
  exports: [ObservabilitySecurityService],
})
export class ObservabilitySecurityModule {}
