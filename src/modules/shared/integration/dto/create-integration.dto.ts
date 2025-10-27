import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsUrl } from 'class-validator';

export enum IntegrationType {
  SHIPPING_CARRIER = 'shipping_carrier',
  PAYMENT_GATEWAY = 'payment_gateway',
  E_INVOICE = 'e_invoice',
  E_SIGNATURE = 'e_signature',
  GPS_TRACKING = 'gps_tracking',
  IoT_PLATFORM = 'iot_platform',
  MARKETPLACE = 'marketplace',
  ERP_SYSTEM = 'erp_system',
  CRM_SYSTEM = 'crm_system',
  BANK_API = 'bank_api',
  SMS_GATEWAY = 'sms_gateway',
  EMAIL_SERVICE = 'email_service',
  WEATHER_SERVICE = 'weather_service',
  MAPS_API = 'maps_api',
  CUSTOMS = 'customs',
  OTHER = 'other',
}

export enum IntegrationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TESTING = 'testing',
  ERROR = 'error',
  SUSPENDED = 'suspended',
}

export enum AuthMethod {
  API_KEY = 'api_key',
  OAUTH2 = 'oauth2',
  BASIC_AUTH = 'basic_auth',
  JWT = 'jwt',
  CERTIFICATE = 'certificate',
  NONE = 'none',
}

export class CreateIntegrationDto {
  @ApiProperty({ example: 'UPS Shipping Integration' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: IntegrationType, example: IntegrationType.SHIPPING_CARRIER })
  @IsEnum(IntegrationType)
  @IsNotEmpty()
  type: IntegrationType;

  @ApiProperty({ example: 'UPS', description: 'Provider/vendor name' })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiProperty({ example: 'https://api.ups.com/v1', description: 'Base API URL' })
  @IsUrl()
  @IsNotEmpty()
  apiUrl: string;

  @ApiProperty({ enum: AuthMethod, example: AuthMethod.API_KEY })
  @IsEnum(AuthMethod)
  @IsNotEmpty()
  authMethod: AuthMethod;

  @ApiProperty({ example: 'your_api_key_here', description: 'API key or token', required: false })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiProperty({ example: 'username', required: false })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ example: 'password', required: false })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({ example: '{"timeout": 30000, "retry": 3}', description: 'Additional configuration as JSON', required: false })
  @IsString()
  @IsOptional()
  config?: string;

  @ApiProperty({ example: true, description: 'Enable webhook notifications', required: false })
  @IsBoolean()
  @IsOptional()
  webhookEnabled?: boolean;

  @ApiProperty({ example: 'https://yourdomain.com/webhooks/ups', description: 'Webhook callback URL', required: false })
  @IsUrl()
  @IsOptional()
  webhookUrl?: string;

  @ApiProperty({ example: 'webhook_secret_key', description: 'Webhook secret for signature verification', required: false })
  @IsString()
  @IsOptional()
  webhookSecret?: string;

  @ApiProperty({ enum: IntegrationStatus, example: IntegrationStatus.ACTIVE, required: false })
  @IsEnum(IntegrationStatus)
  @IsOptional()
  status?: IntegrationStatus;

  @ApiProperty({ example: 'Production integration', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

