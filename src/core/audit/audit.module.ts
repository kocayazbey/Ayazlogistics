import { Module, Global } from '@nestjs/common';
import { EnhancedAuditService } from './audit-enhanced.service';
import { AuditController } from './audit.controller';
import { AuditLoggingInterceptor } from './interceptors/audit-logging.interceptor';
import { DatabaseModule } from '../database/database.module';

@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [AuditController],
  providers: [EnhancedAuditService, AuditLoggingInterceptor],
  exports: [EnhancedAuditService, AuditLoggingInterceptor],
})
export class AuditModule {}

