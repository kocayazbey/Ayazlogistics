import { Module, forwardRef } from '@nestjs/common';
import { WmsController } from './wms.controller';
import { WmsService } from './wms.service';
import { WmsPermissionGuard } from './guards/wms-permission.guard';
import { WmsAuditLoggingService } from './services/wms-audit-logging.service';
import { CommonModule } from '../../../common/module';
import { RealtimeModule } from '../../../realtime/realtime.module';

@Module({
  imports: [CommonModule, forwardRef(() => RealtimeModule)],
  controllers: [WmsController],
  providers: [WmsService, WmsPermissionGuard, WmsAuditLoggingService],
  exports: [WmsService, WmsPermissionGuard, WmsAuditLoggingService],
})
export class WmsModule {}