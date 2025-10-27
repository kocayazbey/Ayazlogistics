import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@Controller({ path: 'orders', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Roles('admin', 'sales', 'operator')
  @ApiOperation({ summary: 'Get all orders' })
  async getAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.ordersService.getAll(tenantId, { page, limit, search, status, customerId });
  }

  @Get('stats')
  @Roles('admin', 'sales')
  @ApiOperation({ summary: 'Get order statistics' })
  async getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.ordersService.getStats(tenantId);
  }

  @Get(':id')
  @Roles('admin', 'sales', 'operator')
  @ApiOperation({ summary: 'Get order by ID' })
  async getById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.ordersService.getById(id, tenantId);
  }

  @Post()
  @Roles('admin', 'sales')
  @ApiOperation({ summary: 'Create new order' })
  async create(@Body() data: any, @CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.ordersService.create(data, tenantId, userId);
  }

  @Put(':id')
  @Roles('admin', 'sales')
  @ApiOperation({ summary: 'Update order' })
  async update(@Param('id') id: string, @Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.ordersService.update(id, data, tenantId);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete order' })
  async delete(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.ordersService.delete(id, tenantId);
  }

  @Patch(':id/status')
  @Roles('admin', 'sales', 'operator')
  @ApiOperation({ summary: 'Update order status' })
  async updateStatus(
    @Param('id') id: string, 
    @Body('status') status: string, 
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.ordersService.updateStatus(id, status, tenantId);
  }
}
