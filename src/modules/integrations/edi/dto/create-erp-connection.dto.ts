import { IsString, IsEnum, IsObject, IsBoolean, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ERPConfigurationDto {
  @ApiProperty({ description: 'Host address', example: 'erp.company.com', required: false })
  @IsOptional()
  @IsString()
  host?: string;

  @ApiProperty({ description: 'Port number', example: 1433, required: false })
  @IsOptional()
  @IsNumber()
  port?: number;

  @ApiProperty({ description: 'Database name', example: 'ERP_DB', required: false })
  @IsOptional()
  @IsString()
  database?: string;

  @ApiProperty({ description: 'Username', example: 'erp_user', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ description: 'Password', example: 'password123', required: false })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ description: 'API endpoint', example: 'https://api.erp.com/v1', required: false })
  @IsOptional()
  @IsString()
  apiEndpoint?: string;

  @ApiProperty({ description: 'API key', example: 'your-api-key', required: false })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiProperty({ description: 'Database schema', example: 'dbo', required: false })
  @IsOptional()
  @IsString()
  schema?: string;

  @ApiProperty({ description: 'Table name', example: 'orders', required: false })
  @IsOptional()
  @IsString()
  table?: string;

  @ApiProperty({ description: 'Webhook URL', example: 'https://webhook.company.com/erp', required: false })
  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @ApiProperty({ description: 'Authentication type', example: 'oauth2', required: false })
  @IsOptional()
  @IsString()
  authentication?: string;
}

export class CreateERPConnectionDto {
  @ApiProperty({ description: 'Connection name', example: 'SAP ERP Connection' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'ERP system', example: 'sap', enum: ['sap', 'oracle', 'microsoft_dynamics', 'netsuite', 'odoo', 'custom'] })
  @IsEnum(['sap', 'oracle', 'microsoft_dynamics', 'netsuite', 'odoo', 'custom'])
  system: 'sap' | 'oracle' | 'microsoft_dynamics' | 'netsuite' | 'odoo' | 'custom';

  @ApiProperty({ description: 'Connection type', example: 'api', enum: ['api', 'database', 'file', 'webhook'] })
  @IsEnum(['api', 'database', 'file', 'webhook'])
  connectionType: 'api' | 'database' | 'file' | 'webhook';

  @ApiProperty({ description: 'Connection configuration' })
  @IsObject()
  configuration: ERPConfigurationDto;

  @ApiProperty({ description: 'Is connection active', example: true })
  @IsBoolean()
  isActive: boolean;
}
