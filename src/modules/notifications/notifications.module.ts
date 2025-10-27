import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { EmailService } from './email/email.service';
import { SMSService } from './sms/sms.service';
import { WhatsAppService } from './whatsapp/whatsapp.service';
import { NotificationsService } from '../logistics/ayaz-user-portal/notifications/notifications.service';
import { DatabaseModule } from '../../core/database/database.module';
import { RealtimeModule } from '../../realtime/realtime.module';
import { IntegrationModule } from '../shared/integration/integration.module';
// NotificationQueueService disabled until Bull queue is configured
// import { NotificationQueueService } from './queue/notification.queue';

@Module({
  imports: [DatabaseModule, RealtimeModule, IntegrationModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailService,
    SMSService,
    WhatsAppService,
    // NotificationQueueService, // Disabled - Bull queue not configured
  ],
  exports: [
    NotificationsService,
    EmailService,
    SMSService,
    WhatsAppService,
    // NotificationQueueService, // Disabled - Bull queue not configured
  ],
})
export class NotificationsModule {}

