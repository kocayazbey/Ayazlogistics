import { Controller, Get, Post, Body, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { ForkliftService } from '../../ayaz-wms/forklift/forklift.service';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { WmsPermissionGuard } from '../guards/wms-permission.guard';
import { WmsPermissions, WMS_PERMISSIONS } from '../decorators/wms-permissions.decorator';
import { AuditLoggingInterceptor } from '../../../../common/interceptors/audit-logging.interceptor';

@ApiTags('WMS Forklift')
@Controller({ path: 'wms/forklift', version: '1' })
@UseGuards(JwtAuthGuard, WmsPermissionGuard)
@UseInterceptors(AuditLoggingInterceptor)
@ApiBearerAuth()
export class ForkliftController {
  constructor(private readonly forkliftService: ForkliftService) {}

  @Post('rt-task')
  @WmsPermissions(WMS_PERMISSIONS.FORKLIFT_MANAGE)
  @ApiOperation({ summary: 'Create RT (Reach Truck) task' })
  async createRTTask(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.forkliftService.createRTTask(data, userId);
  }

  @Post('rt-picking')
  @WmsPermissions(WMS_PERMISSIONS.FORKLIFT_ASSIGN)
  @ApiOperation({ summary: 'Perform RT picking' })
  async performRTPicking(@Body() data: any, @CurrentUser('id') operatorId: string) {
    return this.forkliftService.performRTPicking(data, operatorId);
  }

  @Post('tt-task')
  @WmsPermissions(WMS_PERMISSIONS.FORKLIFT_MANAGE)
  @ApiOperation({ summary: 'Create TT (Turret Truck) task' })
  async createTTTask(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.forkliftService.createTTTask(data, userId);
  }

  @Post('narrow-aisle')
  @WmsPermissions(WMS_PERMISSIONS.FORKLIFT_ASSIGN)
  @ApiOperation({ summary: 'Manage narrow aisle entry/exit' })
  async manageNarrowAisle(@Body() data: any, @CurrentUser('id') operatorId: string) {
    return this.forkliftService.manageNarrowAisle(data, operatorId);
  }

  @Post('validate-area')
  @WmsPermissions(WMS_PERMISSIONS.FORKLIFT_ASSIGN)
  @ApiOperation({ summary: 'Validate forklift working area' })
  async validateWorkingArea(@Body() data: any) {
    return this.forkliftService.validateWorkingArea(data);
  }

  @Post('assign-task')
  @WmsPermissions(WMS_PERMISSIONS.FORKLIFT_ASSIGN)
  @ApiOperation({ summary: 'Assign task to operator' })
  async assignTask(@Body() data: any) {
    return this.forkliftService.assignTask(data.taskId, data.operatorId, data.forkliftId, data.warehouseId);
  }

  @Post('complete-task')
  @WmsPermissions(WMS_PERMISSIONS.FORKLIFT_ASSIGN)
  @ApiOperation({ summary: 'Complete forklift task' })
  async completeTask(@Body() data: any, @CurrentUser('id') operatorId: string) {
    return this.forkliftService.completeTask(data, operatorId);
  }

  @Get('performance')
  @WmsPermissions(WMS_PERMISSIONS.PERFORMANCE_VIEW)
  @ApiOperation({ summary: 'Get forklift performance metrics' })
  async getPerformance(@Query() data: any) {
    return this.forkliftService.getForkliftPerformance(data);
  }
}

