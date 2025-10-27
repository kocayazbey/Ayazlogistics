import { IsString, IsArray, IsBoolean, IsObject, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RetryPolicyDto {
  @ApiProperty({ description: 'Maximum retry attempts', example: 3 })
  @IsNumber()
  maxAttempts: number;

  @ApiProperty({ description: 'Backoff multiplier', example: 2.0 })
  @IsNumber()
  backoffMultiplier: number;

  @ApiProperty({ description: 'Maximum delay in seconds', example: 300 })
  @IsNumber()
  maxDelay: number;
}

export class CreateWebhookDto {
  @ApiProperty({ description: 'Webhook name', example: 'Order Status Updates' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Webhook URL', example: 'https://example.com/webhook' })
  @IsString()
  url: string;

  @ApiProperty({ description: 'Subscribed events', example: ['order.created', 'order.updated'] })
  @IsArray()
  @IsString({ each: true })
  events: string[];

  @ApiProperty({ description: 'Webhook secret', example: 'whsec_1234567890' })
  @IsString()
  secret: string;

  @ApiProperty({ description: 'Is webhook active', example: true })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ description: 'Retry policy' })
  @IsObject()
  retryPolicy: RetryPolicyDto;
}
