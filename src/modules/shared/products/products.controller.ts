import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { ProductsService } from './products.service';

@ApiTags('Products')
@Controller({ path: 'products', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({ status: 200, description: 'Products list retrieved successfully' })
  async getProducts(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.productsService.getAll(tenantId, { page, limit, search, category, status });
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get product categories' })
  async getCategories(@CurrentUser('tenantId') tenantId: string) {
    return this.productsService.getCategories(tenantId);
  }

  @Get('suppliers')
  @ApiOperation({ summary: 'Get product suppliers' })
  async getSuppliers(@CurrentUser('tenantId') tenantId: string) {
    return this.productsService.getSuppliers(tenantId);
  }

  @Get('stats')
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Get products statistics' })
  async getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.productsService.getStats(tenantId);
  }

  @Get('low-stock')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get low stock products' })
  async getLowStock(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('threshold') threshold?: number,
  ) {
    return this.productsService.getLowStock(tenantId, { page, limit, threshold });
  }

  @Get(':id')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get product by ID' })
  async getProductById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.productsService.getById(id, tenantId);
  }

  @Post()
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Create new product' })
  async createProduct(@Body() data: any, @CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.productsService.create(data, tenantId, userId);
  }

  @Put(':id')
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Update product' })
  async updateProduct(@Param('id') id: string, @Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.productsService.update(id, data, tenantId);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete product' })
  async deleteProduct(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.productsService.delete(id, tenantId);
  }

  @Patch(':id/stock')
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Update product stock' })
  async updateStock(@Param('id') id: string, @Body() stock: any, @CurrentUser('tenantId') tenantId: string) {
    return this.productsService.updateStock(id, stock, tenantId);
  }

  @Patch('bulk')
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Bulk update products' })
  async bulkUpdate(@Body() updates: any[], @CurrentUser('tenantId') tenantId: string) {
    return this.productsService.bulkUpdate(updates, tenantId);
  }

  @Get('export')
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Export products' })
  async exportProducts(@Query() filter: any, @CurrentUser('tenantId') tenantId: string) {
    return this.productsService.export(filter, tenantId);
  }

  @Post('import')
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Import products' })
  async importProducts(@Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.productsService.import(data, tenantId);
  }
}
