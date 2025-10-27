import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConnectionPoolService } from '../services/connection-pool.service';
import { QueryOptimizerService } from '../services/query-optimizer.service';
import { DatabaseMonitorService } from '../services/database-monitor.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';

@ApiTags('Database Admin')
@Controller('database')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DatabaseAdminController {
  constructor(
    private readonly connectionPoolService: ConnectionPoolService,
    private readonly queryOptimizerService: QueryOptimizerService,
    private readonly databaseMonitorService: DatabaseMonitorService,
  ) {}

  @Get('connections')
  @Roles('admin')
  @ApiOperation({ summary: 'Get database connection statistics' })
  @ApiResponse({ status: 200, description: 'Connection statistics retrieved successfully' })
  async getConnectionStats() {
    return this.connectionPoolService.getConnectionStats();
  }

  @Get('slow-queries')
  @Roles('admin')
  @ApiOperation({ summary: 'Get slow queries' })
  @ApiResponse({ status: 200, description: 'Slow queries retrieved successfully' })
  async getSlowQueries() {
    return this.connectionPoolService.getSlowQueries();
  }

  @Post('optimize-connections')
  @Roles('admin')
  @ApiOperation({ summary: 'Optimize database connections' })
  @ApiResponse({ status: 200, description: 'Connections optimized successfully' })
  async optimizeConnections() {
    await this.connectionPoolService.optimizeConnections();
    return { message: 'Connections optimized successfully' };
  }

  @Get('suggest-indexes')
  @Roles('admin')
  @ApiOperation({ summary: 'Get index suggestions' })
  @ApiResponse({ status: 200, description: 'Index suggestions retrieved successfully' })
  async suggestIndexes() {
    return this.queryOptimizerService.suggestIndexes();
  }

  @Get('table-stats')
  @Roles('admin')
  @ApiOperation({ summary: 'Get table statistics' })
  @ApiResponse({ status: 200, description: 'Table statistics retrieved successfully' })
  async getTableStats() {
    return this.queryOptimizerService.getTableStats();
  }

  @Get('metrics')
  @Roles('admin')
  @ApiOperation({ summary: 'Get database metrics' })
  @ApiResponse({ status: 200, description: 'Database metrics retrieved successfully' })
  async getMetrics() {
    return this.databaseMonitorService.getMetrics();
  }

  @Get('health')
  @Roles('admin')
  @ApiOperation({ summary: 'Get database health status' })
  @ApiResponse({ status: 200, description: 'Database health status retrieved successfully' })
  async getHealthStatus() {
    return this.databaseMonitorService.getHealthStatus();
  }
}