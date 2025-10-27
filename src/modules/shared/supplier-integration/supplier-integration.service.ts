import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { eq, and, desc, count, gte, lte, or, like } from 'drizzle-orm';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { suppliers, purchaseOrders, purchaseOrderLines } from '../../../database/schema/shared/erp-procurement.schema';
import { invoices, payments, contracts } from '../../../database/schema/shared/billing.schema';
import { stockCards } from '../../../database/schema/shared/erp-inventory.schema';
import { receivingOrders } from '../../../database/schema/shared/wms.schema';

@Injectable()
export class SupplierIntegrationService {
  constructor(private readonly dbService: DatabaseService) {}

  private get db() {
    return this.dbService.getDb();
  }

  async getSuppliers(tenantId: string, filters?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(suppliers.tenantId, tenantId)];

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    try {
      const [data, [{ count: total }]] = await Promise.all([
        this.db
          .select()
          .from(suppliers)
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(suppliers.createdAt)),
        this.db
          .select({ count: count() })
          .from(suppliers)
          .where(whereClause)
      ]);

      return {
        data,
        meta: {
          page,
          limit,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limit),
        },
      };
    } catch (error) {
      console.error('Database error in getSuppliers:', error);
      throw new BadRequestException(`Tedarikçiler alınamadı: ${error.message}`);
    }
  }

  async getSupplierById(id: string, tenantId: string) {
    try {
      const result = await this.db
        .select()
        .from(suppliers)
        .where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId)))
        .limit(1);

      if (!result || result.length === 0) {
        throw new NotFoundException('Tedarikçi bulunamadı');
      }

      return result[0];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Tedarikçi bulunamadı');
    }
  }

  async createSupplier(createSupplierDto: CreateSupplierDto, tenantId: string, userId: string) {
    try {
      const result = await this.db
        .insert(suppliers)
        .values({
          supplierCode: createSupplierDto.code || `SUP-${Date.now()}`,
          companyName: createSupplierDto.name || createSupplierDto.companyName,
          contactName: createSupplierDto.contactPerson || createSupplierDto.contactName,
          email: createSupplierDto.email,
          phone: createSupplierDto.phone,
          address: createSupplierDto.address,
          taxNumber: createSupplierDto.taxId || createSupplierDto.taxNumber,
          paymentTerms: createSupplierDto.paymentTerms,
          leadTimeDays: createSupplierDto.leadTimeDays,
          rating: createSupplierDto.rating,
          tenantId,
        })
        .returning();

      return result[0];
    } catch (error) {
      console.error('Database error in createSupplier:', error);
      throw new BadRequestException(`Tedarikçi oluşturulamadı: ${error.message}`);
    }
  }

  async updateSupplier(id: string, updateSupplierDto: UpdateSupplierDto, tenantId: string) {
    try {
      const result = await this.db
        .update(suppliers)
        .set({ ...updateSupplierDto, updatedAt: new Date() })
        .where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Tedarikçi bulunamadı');
      }

      return result[0];
    } catch (error) {
      console.error('Database error in updateSupplier:', error);
      throw error;
    }
  }

  async getSupplierProducts(id: string, tenantId: string, filters?: { page?: number; limit?: number }) {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const offset = (page - 1) * limit;

      const products = await this.db
        .select()
        .from(stockCards)
        .where(eq(stockCards.tenantId, tenantId))
        .limit(limit)
        .offset(offset);

      return {
        data: products,
        meta: { page, limit, total: products.length, totalPages: 1 },
      };
    } catch (error) {
      console.error('Database error in getSupplierProducts:', error);
      throw new BadRequestException(`Tedarikçi ürünleri alınamadı: ${error.message}`);
    }
  }

  async getSupplierPerformance(id: string, tenantId: string, filters?: { dateFrom?: string; dateTo?: string }) {
    try {
      const conditions = [
        eq(purchaseOrders.supplierId, id),
        eq(purchaseOrders.tenantId, tenantId),
      ];

      if (filters?.dateFrom) {
        conditions.push(gte(purchaseOrders.orderDate, new Date(filters.dateFrom)));
      }

      if (filters?.dateTo) {
        conditions.push(lte(purchaseOrders.orderDate, new Date(filters.dateTo)));
      }

      const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

      const [totalOrders, completedOrders, totalAmount] = await Promise.all([
        this.db.select({ count: count() }).from(purchaseOrders).where(whereClause),
        this.db.select({ count: count() }).from(purchaseOrders).where(
          and(whereClause, eq(purchaseOrders.status, 'completed'))
        ),
        this.db.select({ total: purchaseOrders.totalAmount }).from(purchaseOrders).where(whereClause),
      ]);

      return {
        totalOrders: Number(totalOrders[0].count),
        completedOrders: Number(completedOrders[0].count),
        completionRate: totalOrders[0].count > 0 
          ? (Number(completedOrders[0].count) / Number(totalOrders[0].count)) * 100 
          : 0,
        totalAmount: totalAmount.reduce((sum, item) => sum + Number(item.total || 0), 0),
      };
    } catch (error) {
      console.error('Database error in getSupplierPerformance:', error);
      throw new BadRequestException(`Tedarikçi performansı alınamadı: ${error.message}`);
    }
  }

  async getPurchaseOrders(tenantId: string, filters?: {
    page?: number;
    limit?: number;
    status?: string;
    supplierId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(purchaseOrders.tenantId, tenantId)];

    if (filters?.status) {
      conditions.push(eq(purchaseOrders.status, filters.status));
    }

    if (filters?.supplierId) {
      conditions.push(eq(purchaseOrders.supplierId, filters.supplierId));
    }

    if (filters?.dateFrom) {
      conditions.push(gte(purchaseOrders.orderDate, new Date(filters.dateFrom)));
    }

    if (filters?.dateTo) {
      conditions.push(lte(purchaseOrders.orderDate, new Date(filters.dateTo)));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    try {
      const [data, [{ count: total }]] = await Promise.all([
        this.db
          .select()
          .from(purchaseOrders)
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(purchaseOrders.createdAt)),
        this.db
          .select({ count: count() })
          .from(purchaseOrders)
          .where(whereClause)
      ]);

      return {
        data,
        meta: {
          page,
          limit,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limit),
        },
      };
    } catch (error) {
      console.error('Database error in getPurchaseOrders:', error);
      throw new BadRequestException(`Satın alma siparişleri alınamadı: ${error.message}`);
    }
  }

  async getPurchaseOrderById(id: string, tenantId: string) {
    try {
      const result = await this.db
        .select()
        .from(purchaseOrders)
        .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.tenantId, tenantId)))
        .limit(1);

      if (!result || result.length === 0) {
        throw new NotFoundException('Satın alma siparişi bulunamadı');
      }

      const lines = await this.db
        .select()
        .from(purchaseOrderLines)
        .where(eq(purchaseOrderLines.purchaseOrderId, id));

      return {
        ...result[0],
        lines,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Satın alma siparişi bulunamadı');
    }
  }

  async createPurchaseOrder(createPurchaseOrderDto: CreatePurchaseOrderDto, tenantId: string, userId: string) {
    try {
      const poNumber = `PO-${Date.now()}`;
      const subtotal = createPurchaseOrderDto.items?.reduce((sum, item) => 
        sum + (Number(item.unitPrice) * Number(item.quantity)), 0) || 0;
      const taxAmount = subtotal * 0.18; // %18 KDV
      const totalAmount = subtotal + taxAmount + (Number(createPurchaseOrderDto.shippingCost) || 0);

      const po = await this.db
        .insert(purchaseOrders)
        .values({
          poNumber,
          supplierId: createPurchaseOrderDto.supplierId,
          orderDate: new Date(),
          expectedDeliveryDate: createPurchaseOrderDto.expectedDeliveryDate 
            ? new Date(createPurchaseOrderDto.expectedDeliveryDate) 
            : null,
          status: 'draft',
          subtotal: subtotal.toString(),
          taxAmount: taxAmount.toString(),
          shippingCost: createPurchaseOrderDto.shippingCost?.toString() || '0',
          totalAmount: totalAmount.toString(),
          paymentTerms: createPurchaseOrderDto.paymentTerms,
          notes: createPurchaseOrderDto.notes,
          createdBy: userId,
          tenantId,
        })
        .returning();

      if (createPurchaseOrderDto.items && createPurchaseOrderDto.items.length > 0) {
        await this.db.insert(purchaseOrderLines).values(
          createPurchaseOrderDto.items.map((item, index) => ({
            purchaseOrderId: po[0].id,
            stockCardId: item.stockCardId,
            lineNumber: index + 1,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice.toString(),
            lineTotal: (Number(item.unitPrice) * Number(item.quantity)).toString(),
            tenantId,
          }))
        );
      }

      return await this.getPurchaseOrderById(po[0].id, tenantId);
    } catch (error) {
      console.error('Database error in createPurchaseOrder:', error);
      throw new BadRequestException(`Satın alma siparişi oluşturulamadı: ${error.message}`);
    }
  }

  async updatePurchaseOrder(id: string, updatePurchaseOrderDto: UpdatePurchaseOrderDto, tenantId: string) {
    try {
      const result = await this.db
        .update(purchaseOrders)
        .set({ ...updatePurchaseOrderDto, updatedAt: new Date() })
        .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Satın alma siparişi bulunamadı');
      }

      return result[0];
    } catch (error) {
      console.error('Database error in updatePurchaseOrder:', error);
      throw error;
    }
  }

  async sendPurchaseOrder(id: string, tenantId: string, userId: string) {
    try {
      const result = await this.db
        .update(purchaseOrders)
        .set({
          status: 'sent',
          updatedAt: new Date(),
        })
        .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Satın alma siparişi bulunamadı');
      }

      return result[0];
    } catch (error) {
      console.error('Database error in sendPurchaseOrder:', error);
      throw error;
    }
  }

  async approvePurchaseOrder(id: string, tenantId: string, userId: string) {
    try {
      const result = await this.db
        .update(purchaseOrders)
        .set({
          status: 'approved',
          approvedBy: userId,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Satın alma siparişi bulunamadı');
      }

      return result[0];
    } catch (error) {
      console.error('Database error in approvePurchaseOrder:', error);
      throw error;
    }
  }

  async cancelPurchaseOrder(id: string, reason: string, tenantId: string, userId: string) {
    try {
      const result = await this.db
        .update(purchaseOrders)
        .set({
          status: 'cancelled',
          notes: reason,
          updatedAt: new Date(),
        })
        .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Satın alma siparişi bulunamadı');
      }

      return result[0];
    } catch (error) {
      console.error('Database error in cancelPurchaseOrder:', error);
      throw error;
    }
  }

  async getPurchaseOrderReceipts(id: string, tenantId: string) {
    try {
      await this.getPurchaseOrderById(id, tenantId);
      
      // Receipts için receivingOrders tablosunu kullanabiliriz
      const receipts = await this.db
        .select()
        .from(receivingOrders)
        .where(
          and(
            eq(receivingOrders.tenantId, tenantId),
            or(
              eq(receivingOrders.notes, `PO-${id}`),
              like(receivingOrders.notes, `%${id}%`)
            )
          )
        );

      return receipts;
    } catch (error) {
      console.error('Database error in getPurchaseOrderReceipts:', error);
      throw error;
    }
  }

  async createPurchaseOrderReceipt(id: string, receiptData: any, tenantId: string, userId: string) {
    try {
      const po = await this.getPurchaseOrderById(id, tenantId);
      
      const receipt = await this.db
        .insert(receivingOrders)
        .values({
          receivingNumber: `REC-${Date.now()}`,
          warehouseId: receiptData.warehouseId,
          supplier: receiptData.supplier || 'Supplier',
          receivedDate: new Date(),
          status: 'completed',
          notes: `PO-${id} - ${receiptData.notes || ''}`,
          tenantId,
        })
        .returning();

      // Update PO status
      await this.db
        .update(purchaseOrders)
        .set({
          status: 'received',
          actualDeliveryDate: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.tenantId, tenantId)));

      return receipt[0];
    } catch (error) {
      console.error('Database error in createPurchaseOrderReceipt:', error);
      throw error;
    }
  }

  async getSupplierInvoices(tenantId: string, filters?: {
    page?: number;
    limit?: number;
    status?: string;
    supplierId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(invoices.tenantId, tenantId)];

    if (filters?.status) {
      conditions.push(eq(invoices.status, filters.status));
    }

    if (filters?.dateFrom) {
      conditions.push(gte(invoices.invoiceDate, new Date(filters.dateFrom)));
    }

    if (filters?.dateTo) {
      conditions.push(lte(invoices.invoiceDate, new Date(filters.dateTo)));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    try {
      const [data, [{ count: total }]] = await Promise.all([
        this.db
          .select()
          .from(invoices)
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(invoices.createdAt)),
        this.db
          .select({ count: count() })
          .from(invoices)
          .where(whereClause)
      ]);

      return {
        data,
        meta: {
          page,
          limit,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limit),
        },
      };
    } catch (error) {
      console.error('Database error in getSupplierInvoices:', error);
      throw new BadRequestException(`Tedarikçi faturaları alınamadı: ${error.message}`);
    }
  }

  async getSupplierInvoiceById(id: string, tenantId: string) {
    try {
      const result = await this.db
        .select()
        .from(invoices)
        .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
        .limit(1);

      if (!result || result.length === 0) {
        throw new NotFoundException('Tedarikçi faturası bulunamadı');
      }

      return result[0];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Tedarikçi faturası bulunamadı');
    }
  }

  async approveSupplierInvoice(id: string, tenantId: string, userId: string) {
    try {
      const result = await this.db
        .update(invoices)
        .set({
          status: 'approved',
          updatedAt: new Date(),
        })
        .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Fatura bulunamadı');
      }

      return result[0];
    } catch (error) {
      console.error('Database error in approveSupplierInvoice:', error);
      throw error;
    }
  }

  async paySupplierInvoice(id: string, tenantId: string, userId: string) {
    try {
      const invoice = await this.getSupplierInvoiceById(id, tenantId);
      
      const payment = await this.db
        .insert(payments)
        .values({
          paymentNumber: `PAY-${Date.now()}`,
          invoiceId: id,
          customer: invoice.customer,
          amount: invoice.totalAmount,
          method: 'bank_transfer',
          status: 'processed',
          paymentDate: new Date(),
          processedAt: new Date(),
          tenantId,
        })
        .returning();

      await this.db
        .update(invoices)
        .set({
          status: 'paid',
          paidAt: new Date(),
          paidAmount: invoice.totalAmount,
          balance: '0',
          updatedAt: new Date(),
        })
        .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)));

      return payment[0];
    } catch (error) {
      console.error('Database error in paySupplierInvoice:', error);
      throw error;
    }
  }

  async getSupplierContracts(tenantId: string, filters?: {
    page?: number;
    limit?: number;
    status?: string;
    supplierId?: string;
  }) {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const offset = (page - 1) * limit;

      const conditions = [eq(contracts.tenantId, tenantId)];

      if (filters?.status) {
        conditions.push(eq(contracts.status, filters.status));
      }

      const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

      const [data, [{ count: total }]] = await Promise.all([
        this.db
          .select()
          .from(contracts)
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(contracts.createdAt)),
        this.db
          .select({ count: count() })
          .from(contracts)
          .where(whereClause)
      ]);

      return {
        data,
        meta: {
          page,
          limit,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limit),
        },
      };
    } catch (error) {
      console.error('Database error in getSupplierContracts:', error);
      throw new BadRequestException(`Tedarikçi sözleşmeleri alınamadı: ${error.message}`);
    }
  }

  async getSupplierContractById(id: string, tenantId: string) {
    try {
      const result = await this.db
        .select()
        .from(contracts)
        .where(and(eq(contracts.id, id), eq(contracts.tenantId, tenantId)))
        .limit(1);

      if (!result || result.length === 0) {
        throw new NotFoundException('Tedarikçi sözleşmesi bulunamadı');
      }

      return result[0];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Tedarikçi sözleşmesi bulunamadı');
    }
  }

  async createSupplierContract(contractData: any, tenantId: string, userId: string) {
    try {
      const contractNumber = `CNT-${Date.now()}`;
      
      const result = await this.db
        .insert(contracts)
        .values({
          contractNumber,
          customer: contractData.customer,
          type: contractData.type || 'supplier_agreement',
          status: 'draft',
          totalValue: contractData.totalValue?.toString() || '0',
          startDate: contractData.startDate ? new Date(contractData.startDate) : new Date(),
          endDate: contractData.endDate ? new Date(contractData.endDate) : null,
          tenantId,
        })
        .returning();

      return result[0];
    } catch (error) {
      console.error('Database error in createSupplierContract:', error);
      throw new BadRequestException(`Sözleşme oluşturulamadı: ${error.message}`);
    }
  }

  async getSupplierPerformanceReport(tenantId: string, dateFrom: string, dateTo: string) {
    try {
      const suppliersList = await this.db
        .select()
        .from(suppliers)
        .where(eq(suppliers.tenantId, tenantId));

      const performanceData = await Promise.all(
        suppliersList.map(async (supplier) => {
          const performance = await this.getSupplierPerformance(supplier.id, tenantId, { dateFrom, dateTo });
          return {
            supplier,
            ...performance,
          };
        })
      );

      return {
        period: { from: dateFrom, to: dateTo },
        suppliers: performanceData,
      };
    } catch (error) {
      console.error('Database error in getSupplierPerformanceReport:', error);
      throw new BadRequestException(`Performans raporu alınamadı: ${error.message}`);
    }
  }

  async getPurchaseAnalysisReport(tenantId: string, dateFrom: string, dateTo: string) {
    try {
      const conditions = [
        eq(purchaseOrders.tenantId, tenantId),
        gte(purchaseOrders.orderDate, new Date(dateFrom)),
        lte(purchaseOrders.orderDate, new Date(dateTo)),
      ];

      const [totalPOs, totalAmount, byStatus] = await Promise.all([
        this.db.select({ count: count() }).from(purchaseOrders).where(and(...conditions)),
        this.db.select({ total: purchaseOrders.totalAmount }).from(purchaseOrders).where(and(...conditions)),
        this.db
          .select({ status: purchaseOrders.status, count: count() })
          .from(purchaseOrders)
          .where(and(...conditions))
          .groupBy(purchaseOrders.status),
      ]);

      return {
        period: { from: dateFrom, to: dateTo },
        totalPurchaseOrders: Number(totalPOs[0].count),
        totalAmount: totalAmount.reduce((sum, item) => sum + Number(item.total || 0), 0),
        byStatus,
      };
    } catch (error) {
      console.error('Database error in getPurchaseAnalysisReport:', error);
      throw new BadRequestException(`Satın alma analizi alınamadı: ${error.message}`);
    }
  }

  async getCostAnalysisReport(tenantId: string, dateFrom: string, dateTo: string) {
    try {
      const conditions = [
        eq(purchaseOrders.tenantId, tenantId),
        gte(purchaseOrders.orderDate, new Date(dateFrom)),
        lte(purchaseOrders.orderDate, new Date(dateTo)),
      ];

      const orders = await this.db
        .select()
        .from(purchaseOrders)
        .where(and(...conditions));

      const costBreakdown = {
        subtotal: orders.reduce((sum, order) => sum + Number(order.subtotal || 0), 0),
        tax: orders.reduce((sum, order) => sum + Number(order.taxAmount || 0), 0),
        shipping: orders.reduce((sum, order) => sum + Number(order.shippingCost || 0), 0),
        total: orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
      };

      return {
        period: { from: dateFrom, to: dateTo },
        costBreakdown,
        orderCount: orders.length,
      };
    } catch (error) {
      console.error('Database error in getCostAnalysisReport:', error);
      throw new BadRequestException(`Maliyet analizi alınamadı: ${error.message}`);
    }
  }

  async exportSupplierReport(exportRequest: any, tenantId: string) {
    try {
      const reportType = exportRequest.type || 'performance';
      
      if (reportType === 'performance') {
        return await this.getSupplierPerformanceReport(
          tenantId,
          exportRequest.dateFrom,
          exportRequest.dateTo
        );
      } else if (reportType === 'purchase') {
        return await this.getPurchaseAnalysisReport(
          tenantId,
          exportRequest.dateFrom,
          exportRequest.dateTo
        );
      } else if (reportType === 'cost') {
        return await this.getCostAnalysisReport(
          tenantId,
          exportRequest.dateFrom,
          exportRequest.dateTo
        );
      }

      throw new BadRequestException('Geçersiz rapor tipi');
    } catch (error) {
      console.error('Database error in exportSupplierReport:', error);
      throw error;
    }
  }
}
