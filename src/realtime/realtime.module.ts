import { Module, forwardRef } from '@nestjs/common';
import { RealtimeService } from './services/realtime.service';
import { NotificationService } from './services/notification.service';
import { EventService } from './services/event.service';
import { SseService } from './services/sse.service';
import { WebSocketGateway } from './gateways/websocket.gateway';
import { RealtimeController } from './controllers/realtime.controller';
import { SseController } from './controllers/sse.controller';
import { WmsAuditLoggingService } from '../modules/shared/wms/services/wms-audit-logging.service';
import { WmsModule } from '../modules/shared/wms/wms.module';

@Module({
  imports: [forwardRef(() => WmsModule)],
  controllers: [RealtimeController, SseController],
  providers: [
    RealtimeService,
    NotificationService,
    EventService,
    SseService,
    WebSocketGateway,
    WmsAuditLoggingService,
  ],
  exports: [
    RealtimeService,
    NotificationService,
    EventService,
    SseService,
    WebSocketGateway,
    WmsAuditLoggingService,
  ],
})
export class RealtimeModule {}