import { Controller, Get, Post, Patch, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { MobileHrService } from './mobile-hr.service';

@ApiTags('Mobile HR')
@Controller('api/hr')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MobileHrController {
  constructor(private readonly mobileHrService: MobileHrService) {}

  @Get('employees')
  @Roles('hr_manager', 'manager', 'employee')
  @ApiOperation({ summary: 'Get employees' })
  @ApiQuery({ name: 'department', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getEmployees(
    @CurrentUser('tenantId') tenantId: string,
    @Query('department') department?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const filters = { department, status, search };
    return await this.mobileHrService.getEmployees(tenantId, filters);
  }

  @Get('employees/:id')
  @Roles('hr_manager', 'manager', 'employee')
  @ApiOperation({ summary: 'Get employee by ID' })
  async getEmployeeById(
    @Param('id') employeeId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return await this.mobileHrService.getEmployeeById(employeeId, tenantId);
  }

  @Get('attendance')
  @Roles('hr_manager', 'manager', 'employee')
  @ApiOperation({ summary: 'Get attendance records' })
  @ApiQuery({ name: 'employeeId', required: true })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getAttendance(
    @CurrentUser('tenantId') tenantId: string,
    @Query('employeeId') employeeId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('status') status?: string,
  ) {
    const filters = {
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      status,
    };
    return await this.mobileHrService.getAttendance(employeeId, tenantId, filters);
  }

  @Post('attendance/clock-in')
  @Roles('employee')
  @ApiOperation({ summary: 'Clock in' })
  async clockIn(
    @CurrentUser('id') employeeId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() data: { notes?: string },
  ) {
    return await this.mobileHrService.clockIn(employeeId, tenantId, data.notes);
  }

  @Post('attendance/clock-out')
  @Roles('employee')
  @ApiOperation({ summary: 'Clock out' })
  async clockOut(
    @CurrentUser('id') employeeId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() data: { notes?: string },
  ) {
    return await this.mobileHrService.clockOut(employeeId, tenantId, data.notes);
  }

  @Get('leave-requests')
  @Roles('hr_manager', 'manager', 'employee')
  @ApiOperation({ summary: 'Get leave requests' })
  @ApiQuery({ name: 'employeeId', required: true })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  async getLeaveRequests(
    @CurrentUser('tenantId') tenantId: string,
    @Query('employeeId') employeeId: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const filters = {
      status,
      type,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    };
    return await this.mobileHrService.getLeaveRequests(employeeId, tenantId, filters);
  }

  @Post('leave-requests')
  @Roles('employee')
  @ApiOperation({ summary: 'Create leave request' })
  async createLeaveRequest(
    @CurrentUser('id') employeeId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() data: {
      type: string;
      startDate: string;
      endDate: string;
      reason: string;
    },
  ) {
    return await this.mobileHrService.createLeaveRequest(employeeId, tenantId, {
      ...data,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    });
  }

  @Get('payroll')
  @Roles('hr_manager', 'manager', 'employee')
  @ApiOperation({ summary: 'Get payroll records' })
  @ApiQuery({ name: 'employeeId', required: true })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  async getPayroll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('employeeId') employeeId: string,
    @Query('year') year?: number,
    @Query('month') month?: number,
  ) {
    const filters = { year, month };
    return await this.mobileHrService.getPayroll(employeeId, tenantId, filters);
  }

  @Get('metrics')
  @Roles('hr_manager', 'manager')
  @ApiOperation({ summary: 'Get HR metrics' })
  async getHrMetrics(@CurrentUser('tenantId') tenantId: string) {
    return await this.mobileHrService.getHrMetrics(tenantId);
  }
}