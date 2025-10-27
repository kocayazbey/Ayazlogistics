import { Controller, Get, Post, Body, Param, Query, UseGuards, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { StandardRateLimit } from '../../core/security/decorators/rate-limit.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { NotificationsService } from '../logistics/ayaz-user-portal/notifications/notifications.service';

@ApiTags('Notifications')
@Controller({ path: 'notifications', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}
  @Get()
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  async getNotifications(
    @CurrentUser('id') userId: string,
    @Query('filter') filter?: string,
    @Query('limit') limit: number = 50,
  ) {
    return await this.notificationsService.getUserNotifications(userId, {
      type: filter,
      limit,
    });
  }

  @Post('mark-read/:id')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(
    @Param('id') notificationId: string,
    @CurrentUser('id') userId: string,
  ) {
    const notification = await this.notificationsService.markAsRead(notificationId, userId);
    return { success: true, notification };
  }

  @Post('mark-all-read')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    const result = await this.notificationsService.markAllAsRead(userId);
    return { success: true, ...result };
  }

  @Delete(':id')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Delete notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  async deleteNotification(
    @Param('id') notificationId: string,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.notificationsService.deleteNotification(notificationId, userId);
    return { success: true, ...result };
  }

  @Get('preferences')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiResponse({ status: 200, description: 'Notification preferences' })
  async getPreferences(@CurrentUser('id') userId: string) {
    // TODO: Implement user preferences from database
    return {
      email: true,
      sms: false,
      push: true,
      whatsapp: false,
      categories: {
        orders: true,
        shipments: true,
        billing: true,
        alerts: true,
        system: false,
      },
    };
  }

  @Post('preferences')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() preferences: any,
  ) {
    // TODO: Implement user preferences update in database
    return { success: true, preferences };
  }
}

