import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ConsentNoticeService } from './consent-notice.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

// DTOs
class CreateConsentNoticeDto {
  title: string;
  content: string;
  type: string;
  priority: number;
  isActive: boolean;
  effectiveDate: Date;
  expiryDate?: Date;
}

class UpdateConsentNoticeDto {
  title?: string;
  content?: string;
  type?: string;
  priority?: number;
  isActive?: boolean;
  effectiveDate?: Date;
  expiryDate?: Date;
}

class RecordConsentDto {
  noticeId: string;
  consent: boolean;
}

@ApiTags('Privacy & Consent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('privacy/consent')
export class ConsentNoticeController {
  constructor(private readonly consentNoticeService: ConsentNoticeService) {}

  @Post('notices')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new consent notice' })
  @ApiResponse({ status: 201, description: 'Consent notice created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  async createConsentNotice(@Body() createConsentNoticeDto: CreateConsentNoticeDto) {
    return this.consentNoticeService.createConsentNotice(createConsentNoticeDto);
  }

  @Get('notices')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all consent notices' })
  @ApiResponse({ status: 200, description: 'Consent notices retrieved successfully.' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by notice type' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status' })
  async getConsentNotices(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('type') type?: string,
    @Query('isActive') isActive?: boolean
  ) {
    // Implementation would depend on your pagination service
    return this.consentNoticeService.getActiveConsentNotices();
  }

  @Get('notices/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get consent notice by ID' })
  @ApiParam({ name: 'id', description: 'Consent notice ID' })
  @ApiResponse({ status: 200, description: 'Consent notice retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Consent notice not found.' })
  async getConsentNotice(@Param('id') id: string) {
    return this.consentNoticeService.getConsentNotice(id);
  }

  @Put('notices/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update consent notice' })
  @ApiParam({ name: 'id', description: 'Consent notice ID' })
  @ApiResponse({ status: 200, description: 'Consent notice updated successfully.' })
  @ApiResponse({ status: 404, description: 'Consent notice not found.' })
  async updateConsentNotice(@Param('id') id: string, @Body() updateConsentNoticeDto: UpdateConsentNoticeDto) {
    return this.consentNoticeService.updateConsentNotice(id, updateConsentNoticeDto);
  }

  @Delete('notices/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete consent notice' })
  @ApiParam({ name: 'id', description: 'Consent notice ID' })
  @ApiResponse({ status: 204, description: 'Consent notice deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Consent notice not found.' })
  async deleteConsentNotice(@Param('id') id: string) {
    return this.consentNoticeService.deleteConsentNotice(id);
  }

  @Get('notices/:id/statistics')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get consent notice statistics' })
  @ApiParam({ name: 'id', description: 'Consent notice ID' })
  @ApiResponse({ status: 200, description: 'Consent notice statistics retrieved successfully.' })
  async getConsentStatistics(@Param('id') id: string) {
    return this.consentNoticeService.getConsentStatistics(id);
  }

  @Get('user/:userId/consent/:noticeId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get user consent for specific notice' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'noticeId', description: 'Consent notice ID' })
  @ApiResponse({ status: 200, description: 'User consent retrieved successfully.' })
  async getUserConsent(@Param('userId') userId: string, @Param('noticeId') noticeId: string) {
    return this.consentNoticeService.getUserConsent(userId, noticeId);
  }

  @Post('user/consent')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record user consent' })
  @ApiResponse({ status: 201, description: 'User consent recorded successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  async recordUserConsent(@Body() recordConsentDto: RecordConsentDto) {
    // In a real implementation, you would get the user ID from the JWT token
    const userId = 'current-user-id'; // This should come from the authenticated user
    return this.consentNoticeService.recordUserConsent(userId, recordConsentDto.noticeId, recordConsentDto.consent);
  }

  @Put('user/consent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user consent' })
  @ApiResponse({ status: 200, description: 'User consent updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  async updateUserConsent(@Body() recordConsentDto: RecordConsentDto) {
    // In a real implementation, you would get the user ID from the JWT token
    const userId = 'current-user-id'; // This should come from the authenticated user
    return this.consentNoticeService.updateUserConsent(userId, recordConsentDto.noticeId, recordConsentDto.consent);
  }
}
