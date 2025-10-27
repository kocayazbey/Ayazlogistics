import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { SupplierIntegrationService } from './supplier-integration.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

@ApiTags('Supplier Integration')
@Controller({ path: 'supplier-integration', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SupplierIntegrationController {
  constructor(private readonly supplierIntegrationService: SupplierIntegrationService) {}

  @Get('suppliers')
  @Roles('admin', 'warehouse_manager', 'purchasing_manager')
  @ApiOperation({ summary: 'Get all suppliers' })
  @ApiResponse({ status: 200, description: 'Suppliers retrieved successfully' })
  async getSuppliers(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    return this.supplierIntegrationService.getSuppliers(tenantId, { page, limit, status, category });
  }

  @Get('suppliers/:id')
  @Roles('admin', 'warehouse_manager', 'purchasing_manager')
  @ApiOperation({ summary: 'Get supplier by ID' })
  @ApiResponse({ status: 200, description: 'Supplier retrieved successfully' })
  async getSupplierById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.supplierIntegrationService.getSupplierById(id, tenantId);
  }

  @Post('suppliers')
  @Roles('admin', 'purchasing_manager')
  @ApiOperation({ summary: 'Create new supplier' })
  @ApiResponse({ status: 201, description: 'Supplier created successfully' })
  async createSupplier(
    @Body() createSupplierDto: CreateSupplierDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.supplierIntegrationService.createSupplier(createSupplierDto, tenantId, userId);
  }

  @Put('suppliers/:id')
  @Roles('admin', 'purchasing_manager')
  @ApiOperation({ summary: 'Update supplier' })
  @ApiResponse({ status: 200, description: 'Supplier updated successfully' })
  async updateSupplier(
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.supplierIntegrationService.updateSupplier(id, updateSupplierDto, tenantId);
  }

  @Get('suppliers/:id/products')
  @Roles('admin', 'warehouse_manager', 'purchasing_manager')
  @ApiOperation({ summary: 'Get supplier products' })
  @ApiResponse({ status: 200, description: 'Supplier products retrieved successfully' })
  async getSupplierProducts(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.supplierIntegrationService.getSupplierProducts(id, tenantId, { page, limit });
  }

  @Get('suppliers/:id/performance')
  @Roles('admin', 'warehouse_manager', 'purchasing_manager')
  @ApiOperation({ summary: 'Get supplier performance metrics' })
  @ApiResponse({ status: 200, description: 'Supplier performance retrieved successfully' })
  async getSupplierPerformance(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.supplierIntegrationService.getSupplierPerformance(id, tenantId, { dateFrom, dateTo });
  }

  @Get('purchase-orders')
  @Roles('admin', 'warehouse_manager', 'purchasing_manager')
  @ApiOperation({ summary: 'Get all purchase orders' })
  @ApiResponse({ status: 200, description: 'Purchase orders retrieved successfully' })
  async getPurchaseOrders(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.supplierIntegrationService.getPurchaseOrders(tenantId, { page, limit, status, supplierId, dateFrom, dateTo });
  }

  @Get('purchase-orders/:id')
  @Roles('admin', 'warehouse_manager', 'purchasing_manager')
  @ApiOperation({ summary: 'Get purchase order by ID' })
  @ApiResponse({ status: 200, description: 'Purchase order retrieved successfully' })
  async getPurchaseOrderById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.supplierIntegrationService.getPurchaseOrderById(id, tenantId);
  }

  @Post('purchase-orders')
  @Roles('admin', 'purchasing_manager')
  @ApiOperation({ summary: 'Create new purchase order' })
  @ApiResponse({ status: 201, description: 'Purchase order created successfully' })
  async createPurchaseOrder(
    @Body() createPurchaseOrderDto: CreatePurchaseOrderDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.supplierIntegrationService.createPurchaseOrder(createPurchaseOrderDto, tenantId, userId);
  }

  @Put('purchase-orders/:id')
  @Roles('admin', 'purchasing_manager')
  @ApiOperation({ summary: 'Update purchase order' })
  @ApiResponse({ status: 200, description: 'Purchase order updated successfully' })
  async updatePurchaseOrder(
    @Param('id') id: string,
    @Body() updatePurchaseOrderDto: UpdatePurchaseOrderDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.supplierIntegrationService.updatePurchaseOrder(id, updatePurchaseOrderDto, tenantId);
  }

  @Post('purchase-orders/:id/send')
  @Roles('admin', 'purchasing_manager')
  @ApiOperation({ summary: 'Send purchase order to supplier' })
  @ApiResponse({ status: 200, description: 'Purchase order sent successfully' })
  async sendPurchaseOrder(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.supplierIntegrationService.sendPurchaseOrder(id, tenantId, userId);
  }

  @Post('purchase-orders/:id/approve')
  @Roles('admin', 'purchasing_manager')
  @ApiOperation({ summary: 'Approve purchase order' })
  @ApiResponse({ status: 200, description: 'Purchase order approved successfully' })
  async approvePurchaseOrder(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.supplierIntegrationService.approvePurchaseOrder(id, tenantId, userId);
  }

  @Post('purchase-orders/:id/cancel')
  @Roles('admin', 'purchasing_manager')
  @ApiOperation({ summary: 'Cancel purchase order' })
  @ApiResponse({ status: 200, description: 'Purchase order cancelled successfully' })
  async cancelPurchaseOrder(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.supplierIntegrationService.cancelPurchaseOrder(id, reason, tenantId, userId);
  }

  @Get('purchase-orders/:id/receipts')
  @Roles('admin', 'warehouse_manager', 'purchasing_manager')
  @ApiOperation({ summary: 'Get purchase order receipts' })
  @ApiResponse({ status: 200, description: 'Purchase order receipts retrieved successfully' })
  async getPurchaseOrderReceipts(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.supplierIntegrationService.getPurchaseOrderReceipts(id, tenantId);
  }

  @Post('purchase-orders/:id/receipts')
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Create purchase order receipt' })
  @ApiResponse({ status: 201, description: 'Purchase order receipt created successfully' })
  async createPurchaseOrderReceipt(
    @Param('id') id: string,
    @Body() receiptData: any,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.supplierIntegrationService.createPurchaseOrderReceipt(id, receiptData, tenantId, userId);
  }

  @Get('invoices')
  @Roles('admin', 'warehouse_manager', 'purchasing_manager')
  @ApiOperation({ summary: 'Get supplier invoices' })
  @ApiResponse({ status: 200, description: 'Supplier invoices retrieved successfully' })
  async getSupplierInvoices(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.supplierIntegrationService.getSupplierInvoices(tenantId, { page, limit, status, supplierId, dateFrom, dateTo });
  }

  @Get('invoices/:id')
  @Roles('admin', 'warehouse_manager', 'purchasing_manager')
  @ApiOperation({ summary: 'Get supplier invoice by ID' })
  @ApiResponse({ status: 200, description: 'Supplier invoice retrieved successfully' })
  async getSupplierInvoiceById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.supplierIntegrationService.getSupplierInvoiceById(id, tenantId);
  }

  @Post('invoices/:id/approve')
  @Roles('admin', 'purchasing_manager')
  @ApiOperation({ summary: 'Approve supplier invoice' })
  @ApiResponse({ status: 200, description: 'Supplier invoice approved successfully' })
  async approveSupplierInvoice(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.supplierIntegrationService.approveSupplierInvoice(id, tenantId, userId);
  }

  @Post('invoices/:id/pay')
  @Roles('admin', 'purchasing_manager')
  @ApiOperation({ summary: 'Mark supplier invoice as paid' })
  @ApiResponse({ status: 200, description: 'Supplier invoice marked as paid successfully' })
  async paySupplierInvoice(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.supplierIntegrationService.paySupplierInvoice(id, tenantId, userId);
  }

  @Get('contracts')
  @Roles('admin', 'warehouse_manager', 'purchasing_manager')
  @ApiOperation({ summary: 'Get supplier contracts' })
  @ApiResponse({ status: 200, description: 'Supplier contracts retrieved successfully' })
  async getSupplierContracts(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
  ) {
    return this.supplierIntegrationService.getSupplierContracts(tenantId, { page, limit, status, supplierId });
  }

  @Get('contracts/:id')
  @Roles('admin', 'warehouse_manager', 'purchasing_manager')
  @ApiOperation({ summary: 'Get supplier contract by ID' })
  @ApiResponse({ status: 200, description: 'Supplier contract retrieved successfully' })
  async getSupplierContractById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.supplierIntegrationService.getSupplierContractById(id, tenantId);
  }

  @Post('contracts')
  @Roles('admin', 'purchasing_manager')
  @ApiOperation({ summary: 'Create supplier contract' })
  @ApiResponse({ status: 201, description: 'Supplier contract created successfully' })
  async createSupplierContract(
    @Body() contractData: any,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.supplierIntegrationService.createSupplierContract(contractData, tenantId, userId);
  }

  @Get('reports/supplier-performance')
  @Roles('admin', 'warehouse_manager', 'purchasing_manager')
  @ApiOperation({ summary: 'Get supplier performance report' })
  @ApiResponse({ status: 200, description: 'Supplier performance report retrieved successfully' })
  async getSupplierPerformanceReport(
    @CurrentUser('tenantId') tenantId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.supplierIntegrationService.getSupplierPerformanceReport(tenantId, dateFrom, dateTo);
  }

  @Get('reports/purchase-analysis')
  @Roles('admin', 'warehouse_manager', 'purchasing_manager')
  @ApiOperation({ summary: 'Get purchase analysis report' })
  @ApiResponse({ status: 200, description: 'Purchase analysis report retrieved successfully' })
  async getPurchaseAnalysisReport(
    @CurrentUser('tenantId') tenantId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.supplierIntegrationService.getPurchaseAnalysisReport(tenantId, dateFrom, dateTo);
  }

  @Get('reports/cost-analysis')
  @Roles('admin', 'warehouse_manager', 'purchasing_manager')
  @ApiOperation({ summary: 'Get cost analysis report' })
  @ApiResponse({ status: 200, description: 'Cost analysis report retrieved successfully' })
  async getCostAnalysisReport(
    @CurrentUser('tenantId') tenantId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.supplierIntegrationService.getCostAnalysisReport(tenantId, dateFrom, dateTo);
  }

  @Post('reports/export')
  @Roles('admin', 'warehouse_manager', 'purchasing_manager')
  @ApiOperation({ summary: 'Export supplier integration report' })
  @ApiResponse({ status: 200, description: 'Report exported successfully' })
  async exportSupplierReport(
    @Body() exportRequest: any,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.supplierIntegrationService.exportSupplierReport(exportRequest, tenantId);
  }
}
