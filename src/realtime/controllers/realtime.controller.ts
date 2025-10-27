import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RealtimeService } from '../services/realtime.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';

@ApiTags('Realtime')
@Controller('realtime')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Get('connections')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get real-time connection statistics' })
  @ApiResponse({ status: 200, description: 'Connection statistics retrieved successfully' })
  getConnectionStats() {
    return this.realtimeService.getConnectionStats();
  }
}