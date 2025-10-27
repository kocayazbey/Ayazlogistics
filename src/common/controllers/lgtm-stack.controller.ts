import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LgtmStackService } from '../services/lgtm-stack.service';

@ApiTags('LGTM Stack')
@Controller('lgtm-stack')
export class LgtmStackController {
  constructor(private readonly lgtmStackService: LgtmStackService) {}

  @Post('initialize')
  @ApiOperation({ summary: 'Initialize LGTM stack' })
  @ApiResponse({ status: 200, description: 'LGTM stack initialized successfully' })
  async initializeStack() {
    await this.lgtmStackService.initializeStack();
    return { status: 'LGTM stack initialized successfully' };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get LGTM stack status' })
  @ApiResponse({ status: 200, description: 'Stack status retrieved successfully' })
  async getStackStatus() {
    return await this.lgtmStackService.getStackStatus();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get LGTM stack metrics' })
  @ApiResponse({ status: 200, description: 'Stack metrics retrieved successfully' })
  async getMetrics() {
    return await this.lgtmStackService.getMetrics();
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get LGTM stack alerts' })
  @ApiResponse({ status: 200, description: 'Stack alerts retrieved successfully' })
  async getAlerts() {
    return await this.lgtmStackService.getAlerts();
  }

  @Get('components')
  @ApiOperation({ summary: 'Get all LGTM stack components' })
  @ApiResponse({ status: 200, description: 'Stack components retrieved successfully' })
  getAllComponents() {
    return Array.from(this.lgtmStackService.getAllComponents().entries()).map(([name, component]) => ({
      name,
      component
    }));
  }
}