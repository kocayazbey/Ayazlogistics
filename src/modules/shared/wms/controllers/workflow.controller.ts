import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { WorkflowEngineService } from '../../ayaz-wms/workflow/workflow-engine.service';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { WmsPermissionGuard } from '../guards/wms-permission.guard';
import { WmsPermissions, WMS_PERMISSIONS } from '../decorators/wms-permissions.decorator';
import { AuditLoggingInterceptor } from '../../../../common/interceptors/audit-logging.interceptor';

@ApiTags('WMS Workflow Engine')
@Controller({ path: 'wms/workflow', version: '1' })
@UseGuards(JwtAuthGuard, WmsPermissionGuard)
@UseInterceptors(AuditLoggingInterceptor)
@ApiBearerAuth()
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowEngineService) {}

  @Get('parameters')
  @WmsPermissions(WMS_PERMISSIONS.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Get all workflow parameters' })
  async getAllParameters(@Query('warehouseId') warehouseId: string) {
    return this.workflowService.getAllParameters(warehouseId);
  }

  @Get('parameters/:code')
  @WmsPermissions(WMS_PERMISSIONS.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Get specific parameter value' })
  async getParameter(@Param('code') code: string, @Query('warehouseId') warehouseId: string) {
    return this.workflowService.getParameter(code, warehouseId);
  }

  @Put('parameters/:code')
  @WmsPermissions(WMS_PERMISSIONS.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Set parameter value' })
  async setParameter(@Param('code') code: string, @Body() data: any, @CurrentUser('id') userId: string) {
    return this.workflowService.setParameter(code, data.value, data.warehouseId, userId);
  }

  @Post('rules/evaluate')
  @WmsPermissions(WMS_PERMISSIONS.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Evaluate workflow rule' })
  async evaluateRule(@Body() data: any) {
    return this.workflowService.evaluateRule(data.ruleCode, data.context);
  }
}

