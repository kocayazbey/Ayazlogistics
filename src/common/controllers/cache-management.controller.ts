import { Controller, Post, Get, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CacheInvalidationService, CacheInvalidationRequest } from '../services/cache-invalidation.service';

@ApiTags('Cache Management')
@Controller('api/cache')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CacheManagementController {
  constructor(private readonly cacheInvalidationService: CacheInvalidationService) {}

  @Post('invalidate')
  @Roles('admin', 'super-admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invalidate cache by pattern' })
  @ApiResponse({ status: 200, description: 'Cache invalidated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async invalidateCache(@Body() request: CacheInvalidationRequest) {
    await this.cacheInvalidationService.invalidateCache(request);
    return { message: 'Cache invalidation initiated', pattern: request.pattern };
  }

  @Post('invalidate/user/:userId')
  @Roles('admin', 'super-admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invalidate user-specific cache' })
  @ApiResponse({ status: 200, description: 'User cache invalidated' })
  async invalidateUserCache(@Param('userId') userId: string) {
    await this.cacheInvalidationService.invalidateUserCache(userId);
    return { message: 'User cache invalidated', userId };
  }

  @Post('invalidate/tenant/:tenantId')
  @Roles('admin', 'super-admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invalidate tenant-specific cache' })
  @ApiResponse({ status: 200, description: 'Tenant cache invalidated' })
  async invalidateTenantCache(@Param('tenantId') tenantId: string) {
    await this.cacheInvalidationService.invalidateTenantCache(tenantId);
    return { message: 'Tenant cache invalidated', tenantId };
  }

  @Post('warm')
  @Roles('admin', 'super-admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Warm cache for critical endpoints' })
  @ApiResponse({ status: 200, description: 'Cache warming initiated' })
  async warmCache() {
    await this.cacheInvalidationService.scheduleCacheWarming();
    return { message: 'Cache warming initiated' };
  }

  @Get('stats')
  @Roles('admin', 'super-admin')
  @ApiOperation({ summary: 'Get cache statistics' })
  @ApiResponse({ status: 200, description: 'Cache statistics' })
  async getCacheStats() {
    const stats = await this.cacheInvalidationService.getCacheStats();
    return stats;
  }
}
