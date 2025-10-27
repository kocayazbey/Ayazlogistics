import { IsString, IsEnum, IsObject, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSSOProviderDto {
  @ApiProperty({ description: 'Provider name', example: 'Azure AD' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Provider type', example: 'azure_ad', enum: ['saml', 'oauth2', 'ldap', 'azure_ad', 'google'] })
  @IsEnum(['saml', 'oauth2', 'ldap', 'azure_ad', 'google'])
  type: 'saml' | 'oauth2' | 'ldap' | 'azure_ad' | 'google';

  @ApiProperty({ description: 'Provider configuration', example: { clientId: '123', clientSecret: 'secret' } })
  @IsObject()
  config: Record<string, any>;

  @ApiProperty({ description: 'Is provider active', example: true })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ description: 'Is default provider', example: false })
  @IsBoolean()
  isDefault: boolean;
}
