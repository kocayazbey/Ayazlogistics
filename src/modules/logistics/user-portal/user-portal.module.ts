import { Module } from '@nestjs/common';
import { UserPortalController } from './user-portal.controller';
import { PortalUserService } from '../../../modules/logistics/ayaz-user-portal/user-management/portal-user.service';
import { OrderTrackingService } from '../../../modules/logistics/ayaz-user-portal/order-tracking/order-tracking.service';
import { InventoryViewService } from '../../../modules/logistics/ayaz-user-portal/inventory-view/inventory-view.service';
import { NotificationsService } from '../../../modules/logistics/ayaz-user-portal/notifications/notifications.service';

@Module({
  controllers: [UserPortalController],
  providers: [
    PortalUserService,
    OrderTrackingService,
    InventoryViewService,
    NotificationsService,
  ],
  exports: [
    PortalUserService,
    OrderTrackingService,
    InventoryViewService,
    NotificationsService,
  ],
})
export class UserPortalModule {}

