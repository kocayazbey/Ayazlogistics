import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { IPFilterService, IPFilterRule } from './ip-filter.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { StandardRateLimit } from './decorators/rate-limit.decorator';

@ApiTags('Security')
@Controller({ path: 'security/ip-filter', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class IPFilterController {
  constructor(private readonly ipFilterService: IPFilterService) {}

  @Get('whitelist')
  @Roles('admin', 'security_admin')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get IP whitelist' })
  @ApiResponse({ status: 200, description: 'Whitelist retrieved' })
  async getWhitelist() {
    return this.ipFilterService.getWhitelist();
  }

  @Get('blacklist')
  @Roles('admin', 'security_admin')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get IP blacklist' })
  @ApiResponse({ status: 200, description: 'Blacklist retrieved' })
  async getBlacklist() {
    return this.ipFilterService.getBlacklist();
  }

  @Get('stats')
  @Roles('admin', 'security_admin')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get IP filter statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getStats() {
    return this.ipFilterService.getStats();
  }

  @Post('whitelist')
  @Roles('admin', 'security_admin')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Add IP to whitelist' })
  @ApiResponse({ status: 201, description: 'IP added to whitelist' })
  async addToWhitelist(@Body() rule: IPFilterRule) {
    await this.ipFilterService.addToWhitelist(rule);
    return { message: 'IP added to whitelist successfully', ip: rule.ip };
  }

  @Post('blacklist')
  @Roles('admin', 'security_admin')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Add IP to blacklist' })
  @ApiResponse({ status: 201, description: 'IP added to blacklist' })
  async addToBlacklist(@Body() rule: IPFilterRule) {
    await this.ipFilterService.addToBlacklist(rule);
    return { message: 'IP added to blacklist successfully', ip: rule.ip };
  }

  @Delete('whitelist/:ip')
  @Roles('admin', 'security_admin')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Remove IP from whitelist' })
  @ApiResponse({ status: 200, description: 'IP removed from whitelist' })
  async removeFromWhitelist(@Param('ip') ip: string) {
    await this.ipFilterService.removeFromWhitelist(ip);
    return { message: 'IP removed from whitelist successfully', ip };
  }

  @Delete('blacklist/:ip')
  @Roles('admin', 'security_admin')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Remove IP from blacklist' })
  @ApiResponse({ status: 200, description: 'IP removed from blacklist' })
  async removeFromBlacklist(@Param('ip') ip: string) {
    await this.ipFilterService.removeFromBlacklist(ip);
    return { message: 'IP removed from blacklist successfully', ip };
  }

  @Post('temp-block')
  @Roles('admin', 'security_admin')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Temporarily block an IP' })
  @ApiResponse({ status: 201, description: 'IP temporarily blocked' })
  async tempBlock(
    @Body() data: { ip: string; duration: number; reason: string },
  ) {
    await this.ipFilterService.tempBlock(data.ip, data.duration, data.reason);
    return {
      message: 'IP temporarily blocked',
      ip: data.ip,
      duration: data.duration,
    };
  }
}

