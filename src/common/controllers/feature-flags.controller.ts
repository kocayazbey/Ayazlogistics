import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FeatureFlagsService } from '../services/feature-flags.service';

@ApiTags('Feature Flags')
@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Post('initialize')
  @ApiOperation({ summary: 'Initialize feature flags' })
  @ApiResponse({ status: 200, description: 'Feature flags initialized successfully' })
  async initializeFlags() {
    await this.featureFlagsService.initializeFlags();
    return { status: 'Feature flags initialized successfully' };
  }

  @Get('flags')
  @ApiOperation({ summary: 'Get all feature flags' })
  @ApiResponse({ status: 200, description: 'Feature flags retrieved successfully' })
  getAllFlags() {
    return Array.from(this.featureFlagsService.getAllFlags().entries()).map(([name, config]) => ({
      name,
      config
    }));
  }

  @Get('flags/:flagName')
  @ApiOperation({ summary: 'Get specific feature flag' })
  @ApiResponse({ status: 200, description: 'Feature flag retrieved successfully' })
  getFlag(@Param('flagName') flagName: string) {
    const flag = this.featureFlagsService.getAllFlags().get(flagName);
    return { name: flagName, config: flag };
  }

  @Post('flags')
  @ApiOperation({ summary: 'Create feature flag' })
  @ApiResponse({ status: 201, description: 'Feature flag created successfully' })
  async createFlag(@Body() body: { flagName: string; config: any }) {
    await this.featureFlagsService.createFlag(body.flagName, body.config);
    return { status: 'Feature flag created successfully' };
  }

  @Post('flags/:flagName')
  @ApiOperation({ summary: 'Update feature flag' })
  @ApiResponse({ status: 200, description: 'Feature flag updated successfully' })
  async updateFlag(@Param('flagName') flagName: string, @Body() body: { config: any }) {
    await this.featureFlagsService.updateFlag(flagName, body.config);
    return { status: 'Feature flag updated successfully' };
  }

  @Delete('flags/:flagName')
  @ApiOperation({ summary: 'Delete feature flag' })
  @ApiResponse({ status: 200, description: 'Feature flag deleted successfully' })
  async deleteFlag(@Param('flagName') flagName: string) {
    await this.featureFlagsService.deleteFlag(flagName);
    return { status: 'Feature flag deleted successfully' };
  }

  @Get('flags/:flagName/history')
  @ApiOperation({ summary: 'Get feature flag history' })
  @ApiResponse({ status: 200, description: 'Feature flag history retrieved successfully' })
  async getFlagHistory(@Param('flagName') flagName: string) {
    return await this.featureFlagsService.getFlagHistory(flagName);
  }

  @Get('flags/:flagName/metrics')
  @ApiOperation({ summary: 'Get feature flag metrics' })
  @ApiResponse({ status: 200, description: 'Feature flag metrics retrieved successfully' })
  async getFlagMetrics(@Param('flagName') flagName: string) {
    return await this.featureFlagsService.getFlagMetrics(flagName);
  }

  @Get('user/:userId/:tenantId')
  @ApiOperation({ summary: 'Get feature flags for user' })
  @ApiResponse({ status: 200, description: 'User feature flags retrieved successfully' })
  async getFlagsForUser(@Param('userId') userId: string, @Param('tenantId') tenantId: string) {
    return await this.featureFlagsService.getFlagsForUser(userId, tenantId);
  }
}