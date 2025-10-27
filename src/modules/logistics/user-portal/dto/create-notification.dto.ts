import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, IsBoolean, IsDateString } from 'class-validator';

export enum NotificationType {
  ORDER_UPDATE = 'order_update',
  DELIVERY_UPDATE = 'delivery_update',
  INVOICE = 'invoice',
  PAYMENT_DUE = 'payment_due',
  DOCUMENT_READY = 'document_ready',
  INVENTORY_ALERT = 'inventory_alert',
  SYSTEM_ALERT = 'system_alert',
  PROMOTIONAL = 'promotional',
  GENERAL = 'general',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  WHATSAPP = 'whatsapp',
}

export class CreateNotificationDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Target user ID' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 'Order Shipped' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Your order #12345 has been shipped and is on the way.' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ enum: NotificationType, example: NotificationType.DELIVERY_UPDATE })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @ApiProperty({ enum: NotificationPriority, example: NotificationPriority.NORMAL, required: false })
  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @ApiProperty({ type: [String], enum: NotificationChannel, example: [NotificationChannel.IN_APP, NotificationChannel.EMAIL], required: false })
  @IsArray()
  @IsOptional()
  channels?: NotificationChannel[];

  @ApiProperty({ example: '/orders/12345', description: 'Deep link or action URL', required: false })
  @IsString()
  @IsOptional()
  actionUrl?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Related entity ID (order, shipment, etc.)', required: false })
  @IsUUID()
  @IsOptional()
  relatedEntityId?: string;

  @ApiProperty({ example: 'order', description: 'Related entity type', required: false })
  @IsString()
  @IsOptional()
  relatedEntityType?: string;

  @ApiProperty({ example: 'https://example.com/icon.png', description: 'Notification icon URL', required: false })
  @IsString()
  @IsOptional()
  iconUrl?: string;

  @ApiProperty({ example: true, description: 'Require user acknowledgment', required: false })
  @IsBoolean()
  @IsOptional()
  requireAcknowledgment?: boolean;

  @ApiProperty({ example: '2025-10-27T10:00:00Z', description: 'Schedule notification for later', required: false })
  @IsDateString()
  @IsOptional()
  scheduledFor?: string;

  @ApiProperty({ example: '2025-11-24T10:00:00Z', description: 'Notification expiry time', required: false })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiProperty({ example: '{"orderId": "12345", "trackingNumber": "TRACK123"}', description: 'Additional data as JSON', required: false })
  @IsString()
  @IsOptional()
  metadata?: string;
}

