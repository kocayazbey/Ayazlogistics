import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { HrService } from '../ayaz-erp/hr/hr.service';
import { CreateEmployeeDto } from '../ayaz-erp/hr/dto/create-employee.dto';
import { UpdateEmployeeDto } from '../ayaz-erp/hr/dto/update-employee.dto';
import { CreateDepartmentDto } from '../ayaz-erp/hr/dto/create-department.dto';
import { CreatePositionDto } from '../ayaz-erp/hr/dto/create-position.dto';

@ApiTags('ERP HR')
@Controller({ path: 'erp/hr', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class HrController {
  constructor(private readonly hrService: HrService) {}

  @Get('employees')
  @ApiOperation({ summary: 'Get all employees' })
  @ApiQuery({ name: 'department', required: false, description: 'Filter by department' })
  @ApiQuery({ name: 'position', required: false, description: 'Filter by position' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by employment status' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Employees retrieved successfully' })
  async getEmployees(
    @Query('department') department?: string,
    @Query('position') position?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.hrService.getEmployees({
      tenantId,
      department,
      position,
      status,
      search,
      page,
      limit
    });
  }

  @Get('employees/stats')
  @ApiOperation({ summary: 'Get employees statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getEmployeesStats(@CurrentUser('tenantId') tenantId: string) {
    return this.hrService.getEmployeesStats(tenantId);
  }

  @Get('departments')
  @ApiOperation({ summary: 'Get all departments' })
  @ApiResponse({ status: 200, description: 'Departments retrieved successfully' })
  async getDepartments(@CurrentUser('tenantId') tenantId: string) {
    return this.hrService.getDepartments(tenantId);
  }

  @Get('positions')
  @ApiOperation({ summary: 'Get all positions' })
  @ApiResponse({ status: 200, description: 'Positions retrieved successfully' })
  async getPositions(@CurrentUser('tenantId') tenantId: string) {
    return this.hrService.getPositions(tenantId);
  }

  @Get('employees/:id')
  @ApiOperation({ summary: 'Get employee by ID' })
  @ApiResponse({ status: 200, description: 'Employee retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async getEmployee(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.hrService.getEmployee(id, tenantId);
  }

  @Post('employees')
  @Roles('admin', 'manager', 'hr_manager')
  @ApiOperation({ summary: 'Create new employee' })
  @ApiResponse({ status: 201, description: 'Employee created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createEmployee(
    @Body() createEmployeeDto: CreateEmployeeDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.hrService.createEmployee(createEmployeeDto, userId, tenantId);
  }

  @Put('employees/:id')
  @Roles('admin', 'manager', 'hr_manager')
  @ApiOperation({ summary: 'Update employee' })
  @ApiResponse({ status: 200, description: 'Employee updated successfully' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async updateEmployee(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.hrService.updateEmployee(id, updateEmployeeDto, userId, tenantId);
  }

  @Post('departments')
  @Roles('admin', 'manager', 'hr_manager')
  @ApiOperation({ summary: 'Create new department' })
  @ApiResponse({ status: 201, description: 'Department created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createDepartment(
    @Body() createDepartmentDto: CreateDepartmentDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.hrService.createDepartment(createDepartmentDto, userId, tenantId);
  }

  @Post('positions')
  @Roles('admin', 'manager', 'hr_manager')
  @ApiOperation({ summary: 'Create new position' })
  @ApiResponse({ status: 201, description: 'Position created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createPosition(
    @Body() createPositionDto: CreatePositionDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.hrService.createPosition(createPositionDto, userId, tenantId);
  }

  @Get('employees/:id/attendance')
  @ApiOperation({ summary: 'Get employee attendance' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for attendance' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for attendance' })
  @ApiResponse({ status: 200, description: 'Attendance retrieved successfully' })
  async getEmployeeAttendance(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.hrService.getEmployeeAttendance(id, tenantId, { startDate, endDate });
  }

  @Get('employees/:id/performance')
  @ApiOperation({ summary: 'Get employee performance' })
  @ApiQuery({ name: 'year', required: false, description: 'Performance year' })
  @ApiResponse({ status: 200, description: 'Performance retrieved successfully' })
  async getEmployeePerformance(
    @Param('id') id: string,
    @Query('year') year?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.hrService.getEmployeePerformance(id, tenantId, year);
  }

  @Get('employees/:id/benefits')
  @ApiOperation({ summary: 'Get employee benefits' })
  @ApiResponse({ status: 200, description: 'Benefits retrieved successfully' })
  async getEmployeeBenefits(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.hrService.getEmployeeBenefits(id, tenantId);
  }

  @Get('reports/payroll')
  @ApiOperation({ summary: 'Get payroll report' })
  @ApiQuery({ name: 'month', required: false, description: 'Payroll month' })
  @ApiQuery({ name: 'year', required: false, description: 'Payroll year' })
  @ApiResponse({ status: 200, description: 'Payroll report retrieved successfully' })
  async getPayrollReport(
    @Query('month') month?: string,
    @Query('year') year?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.hrService.getPayrollReport(tenantId, { month, year });
  }

  @Get('reports/attendance')
  @ApiOperation({ summary: 'Get attendance report' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for report' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for report' })
  @ApiResponse({ status: 200, description: 'Attendance report retrieved successfully' })
  async getAttendanceReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.hrService.getAttendanceReport(tenantId, { startDate, endDate });
  }
}
