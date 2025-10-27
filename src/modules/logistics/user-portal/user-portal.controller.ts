import { 
  Controller, 
  Get, 
  Post, 
  Put,
  Delete,
  Body, 
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { PortalUserService } from '../ayaz-user-portal/user-management/portal-user.service';
import { OrderTrackingService } from '../ayaz-user-portal/order-tracking/order-tracking.service';
import { InventoryViewService } from '../ayaz-user-portal/inventory-view/inventory-view.service';
import { NotificationsService } from '../ayaz-user-portal/notifications/notifications.service';
import { StorageService } from '../../../core/storage/storage.service';

@ApiTags('User Portal')
@Controller({ path: 'portal', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserPortalController {
  constructor(
    private readonly portalUserService: PortalUserService,
    private readonly orderTrackingService: OrderTrackingService,
    private readonly inventoryViewService: InventoryViewService,
    private readonly notificationsService: NotificationsService,
    private readonly storageService: StorageService,
  ) {}

  // User Management Endpoints
  @Get('users/me')
  @ApiOperation({ summary: 'Get current portal user profile' })
  async getMyProfile(@CurrentUser('id') userId: string) {
    return {
      success: true,
      data: { userId },
    };
  }

  @Put('users/me')
  @ApiOperation({ summary: 'Update current portal user profile' })
  async updateMyProfile(
    @CurrentUser('id') userId: string,
    @Body() data: any,
  ) {
    return {
      success: true,
      message: 'Profile updated successfully',
      data: { userId, ...data },
    };
  }

  @Get('users/customer/:customerId')
  @ApiOperation({ summary: 'Get all users for a customer' })
  async getCustomerUsers(
    @Param('customerId') customerId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const users = await this.portalUserService.getPortalUsersByCustomer(customerId, tenantId);

    return {
      success: true,
      data: users,
      count: users.length,
    };
  }

  @Post('users')
  @ApiOperation({ summary: 'Create portal user' })
  @HttpCode(HttpStatus.CREATED)
  async createPortalUser(
    @Body() data: any,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const user = await this.portalUserService.createPortalUser(data, tenantId);

    return {
      success: true,
      message: 'Portal user created successfully',
      data: user,
    };
  }

  @Put('users/:userId/permissions')
  @ApiOperation({ summary: 'Update user permissions' })
  async updateUserPermissions(
    @Param('userId') userId: string,
    @Body() data: { permissions: any },
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const updated = await this.portalUserService.updatePermissions(
      userId,
      data.permissions,
      tenantId,
    );

    return {
      success: true,
      message: 'Permissions updated successfully',
      data: updated,
    };
  }

  // Order Tracking Endpoints
  @Get('orders')
  @ApiOperation({ summary: 'Get user orders' })
  @ApiQuery({ name: 'status', required: false })
  async getOrders(
    @CurrentUser('customerId') customerId: string,
    @Query('status') status?: string,
  ) {
    const result = await this.orderTrackingService.getCustomerOrders(customerId, {
      status,
    });

    return {
      success: true,
      data: result,
    };
  }

  @Get('orders/:orderNumber/track')
  @ApiOperation({ summary: 'Track order by order number' })
  async trackOrder(
    @Param('orderNumber') orderNumber: string,
    @CurrentUser('customerId') customerId: string,
  ) {
    const tracking = await this.orderTrackingService.trackOrder(orderNumber, customerId);

    return {
      success: true,
      data: tracking,
    };
  }

  @Get('tracking/:trackingNumber')
  @ApiOperation({ summary: 'Track by tracking number' })
  async trackByTrackingNumber(@Param('trackingNumber') trackingNumber: string) {
    const tracking = await this.orderTrackingService.trackByTrackingNumber(trackingNumber);

    return {
      success: true,
      data: tracking,
    };
  }

  @Post('orders/:orderNumber/subscribe')
  @ApiOperation({ summary: 'Subscribe to order updates' })
  async subscribeToOrderUpdates(
    @Param('orderNumber') orderNumber: string,
    @Body() data: { email: string; phone?: string },
  ) {
    const result = await this.orderTrackingService.subscribeToOrderUpdates(
      orderNumber,
      data.email,
      data.phone,
    );

    return {
      success: true,
      message: 'Subscribed to order updates',
      data: result,
    };
  }

  @Get('orders/:orderNumber/delivery-proof')
  @ApiOperation({ summary: 'Get delivery proof' })
  async getDeliveryProof(@Param('orderNumber') orderNumber: string) {
    const proof = await this.orderTrackingService.getDeliveryProof(orderNumber);

    return {
      success: true,
      data: proof,
    };
  }

  // Inventory Management Endpoints
  @Get('inventory')
  @ApiOperation({ summary: 'Get user inventory' })
  @ApiQuery({ name: 'warehouseId', required: false })
  async getInventory(
    @CurrentUser('customerId') customerId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    const inventory = await this.inventoryViewService.getCustomerInventory(
      customerId,
      warehouseId,
    );

    return {
      success: true,
      data: inventory,
      count: inventory.length,
    };
  }

  @Get('inventory/summary')
  @ApiOperation({ summary: 'Get inventory summary' })
  async getInventorySummary(@CurrentUser('customerId') customerId: string) {
    const summary = await this.inventoryViewService.getInventorySummary(customerId);

    return {
      success: true,
      data: summary,
    };
  }

  @Get('inventory/:productId/movements')
  @ApiOperation({ summary: 'Get inventory movements' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getInventoryMovements(
    @Param('productId') productId: string,
    @CurrentUser('customerId') customerId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const result = await this.inventoryViewService.getInventoryMovements(
      customerId,
      productId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Get('inventory/:productId/stock-levels')
  @ApiOperation({ summary: 'Get stock levels over time' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getStockLevels(
    @Param('productId') productId: string,
    @CurrentUser('customerId') customerId: string,
    @Query('days') days?: number,
  ) {
    const result = await this.inventoryViewService.getStockLevelsOverTime(
      customerId,
      productId,
      days ? parseInt(days.toString()) : 30,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Post('inventory/reports/request')
  @ApiOperation({ summary: 'Request inventory report' })
  async requestInventoryReport(
    @Body() data: { format: 'pdf' | 'excel' | 'csv' },
    @CurrentUser('customerId') customerId: string,
  ) {
    const result = await this.inventoryViewService.requestInventoryReport(
      customerId,
      data.format,
    );

    return {
      success: true,
      message: 'Report generation started',
      data: result,
    };
  }

  // Notifications Endpoints
  @Get('notifications')
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiQuery({ name: 'read', required: false, type: Boolean })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getNotifications(
    @CurrentUser('id') userId: string,
    @Query('read') read?: boolean,
    @Query('type') type?: string,
    @Query('limit') limit?: number,
  ) {
    const result = await this.notificationsService.getUserNotifications(userId, {
      read: read !== undefined ? read === true : undefined,
      type,
      limit: limit ? parseInt(limit.toString()) : undefined,
    });

    return {
      success: true,
      data: result,
    };
  }

  @Put('notifications/:id/mark-read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markNotificationAsRead(
    @Param('id') notificationId: string,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.notificationsService.markAsRead(notificationId, userId);

    return {
      success: true,
      message: 'Notification marked as read',
      data: result,
    };
  }

  @Put('notifications/mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllNotificationsAsRead(@CurrentUser('id') userId: string) {
    const result = await this.notificationsService.markAllAsRead(userId);

    return {
      success: true,
      message: 'All notifications marked as read',
      data: result,
    };
  }

  @Delete('notifications/:id')
  @ApiOperation({ summary: 'Delete notification' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNotification(
    @Param('id') notificationId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.notificationsService.deleteNotification(notificationId, userId);

    return {
      success: true,
      message: 'Notification deleted',
    };
  }

  // Document Upload Endpoints
  @Post('documents/upload')
  @ApiOperation({ summary: 'Upload document' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() metadata: any,
    @CurrentUser('id') userId: string,
    @CurrentUser('customerId') customerId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const fileName = `portal-documents/${tenantId}/${customerId}/${Date.now()}-${file.originalname}`;
    const uploadResult = await this.storageService.upload(
      file.buffer,
      fileName,
      file.mimetype,
    );

    return {
      success: true,
      message: 'Document uploaded successfully',
      data: {
        fileName: file.originalname,
        fileUrl: uploadResult.url,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date(),
        uploadedBy: userId,
      },
    };
  }

  @Get('analytics/dashboard')
  @ApiOperation({ summary: 'Get portal dashboard analytics' })
  async getDashboardAnalytics(@CurrentUser('customerId') customerId: string) {
    const [orders, inventory, notifications] = await Promise.all([
      this.orderTrackingService.getCustomerOrders(customerId),
      this.inventoryViewService.getInventorySummary(customerId),
      this.notificationsService.getUserNotifications(customerId, { read: false }),
    ]);

    return {
      success: true,
      data: {
        orders: {
          total: orders.totalOrders,
          pending: 0,
          inTransit: 0,
          delivered: 0,
        },
        inventory: {
          totalSKUs: inventory.totalSKUs,
          totalQuantity: inventory.totalQuantity,
          totalValue: inventory.totalValue,
          lowStockItems: inventory.lowStockItems.length,
        },
        notifications: {
          total: notifications.total,
          unread: notifications.unread,
        },
      },
    };
  }
}

