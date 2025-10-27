import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@ApiTags('Mobile Tasks')
@Controller({ path: 'mobile/tasks', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @Roles('admin', 'manager', 'driver', 'warehouse_worker')
  @ApiOperation({ summary: 'Get tasks for mobile user' })
  @ApiQuery({ name: 'role', required: true })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  async getTasks(
    @CurrentUser('tenantId') tenantId: string,
    @Query('role') role: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assignedTo') assignedTo?: string
  ) {
    const filters = { status, priority, assignedTo };
    return this.tasksService.getTasksForRole(tenantId, role, filters);
  }

  @Post()
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create task' })
  async createTask(
    @Body() createTaskDto: CreateTaskDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.tasksService.createTask({ ...createTaskDto, tenantId });
  }

  @Put(':id')
  @Roles('admin', 'manager', 'driver', 'warehouse_worker')
  @ApiOperation({ summary: 'Update task' })
  async updateTask(
    @Param('id') taskId: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.tasksService.updateTask(taskId, updateTaskDto, tenantId);
  }

  @Patch(':id/status')
  @Roles('admin', 'manager', 'driver', 'warehouse_worker')
  @ApiOperation({ summary: 'Update task status' })
  async updateTaskStatus(
    @Param('id') taskId: string,
    @Body() data: { status: string; notes?: string },
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.tasksService.updateTaskStatus(taskId, data.status, data.notes, tenantId);
  }

  @Get(':id')
  @Roles('admin', 'manager', 'driver', 'warehouse_worker')
  @ApiOperation({ summary: 'Get task details' })
  async getTaskDetails(
    @Param('id') taskId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.tasksService.getTaskDetails(taskId, tenantId);
  }
}
