import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, between, and, gte, lte, or, sql } from 'drizzle-orm';
import { receivingOrders, inventory, products, locations } from '../../../../database/schema/shared/wms.schema';
import { stockMovements } from '../../../../database/schema/shared/erp-inventory.schema';

/**
 * Receiving Reports Service
 * Comprehensive reporting for all receiving operations
 * Based on Axata WMS: Giriş Raporları (Tesellüm, Giriş Takip, Reddedilen Paletler)
 */
@Injectable()
export class ReceivingReportsService {
  private readonly logger = new Logger(ReceivingReportsService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
  ) {}

  /**
   * Acceptance Report (Tesellüm Raporu)
   * Detailed report of all accepted receiving orders
   */
  async acceptanceReport(warehouseId: string, startDate: Date, endDate: Date, options?: {
    supplierId?: string;
    productId?: string;
    receivingType?: string;
    includeDetails?: boolean;
  }) {
    const receivings = await this.db
      .select({
        receivingOrder: receivingOrders,
        location: locations,
      })
      .from(receivingOrders)
      .leftJoin(locations, eq(receivingOrders.destinationLocationId, locations.id))
      .where(
        and(
          eq(receivingOrders.warehouseId, warehouseId),
          between(receivingOrders.createdAt, startDate, endDate),
          eq(receivingOrders.status, 'completed')
        )
      );

    const detailedReceivings = await Promise.all(
      receivings.map(async (rec) => {
        const items = options?.includeDetails ? await this.getReceivingItems(rec.receivingOrder.id) : [];
        
        return {
          receivingOrderId: rec.receivingOrder.id,
          receivingNumber: rec.receivingOrder.receivingNumber,
          poNumber: rec.receivingOrder.poNumber,
          supplier: rec.receivingOrder.supplier,
          receivedDate: rec.receivingOrder.receivedDate,
          receivedBy: rec.receivingOrder.receivedBy,
          status: rec.receivingOrder.status,
          destinationLocation: rec.location?.code,
          totalItems: items.length,
          totalQuantity: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
          totalPallets: items.filter(item => item.palletId).length,
          items: options?.includeDetails ? items : undefined,
          qualityCheckPassed: rec.receivingOrder.metadata?.qualityCheckPassed,
          documentsComplete: rec.receivingOrder.metadata?.documentsComplete,
          receivingDuration: this.calculateDuration(rec.receivingOrder.createdAt, rec.receivingOrder.receivedDate),
          notes: rec.receivingOrder.notes,
        };
      })
    );

    const summary = {
      totalReceivingOrders: receivings.length,
      totalQuantity: detailedReceivings.reduce((sum, r) => sum + r.totalQuantity, 0),
      totalPallets: detailedReceivings.reduce((sum, r) => sum + r.totalPallets, 0),
      avgReceivingDuration: this.calculateAverageMinutes(detailedReceivings.map(r => r.receivingDuration)),
      bySupplier: this.groupBySupplier(detailedReceivings),
      byDay: this.groupByDay(detailedReceivings, startDate, endDate),
      byReceivingType: this.groupByReceivingType(detailedReceivings),
      qualityMetrics: {
        passedQualityCheck: detailedReceivings.filter(r => r.qualityCheckPassed).length,
        failedQualityCheck: detailedReceivings.filter(r => r.qualityCheckPassed === false).length,
        documentsComplete: detailedReceivings.filter(r => r.documentsComplete).length,
      },
    };

    return {
      warehouseId,
      period: { startDate, endDate },
      summary,
      receivings: detailedReceivings,
      generatedAt: new Date(),
      reportType: 'acceptance',
    };
  }

  /**
   * Receiving Tracking Report (Giriş Takip Raporu)
   * Real-time tracking of receiving status
   */
  async receivingTrackingReport(warehouseId: string, startDate: Date, endDate: Date, options?: {
    includeInProgress?: boolean;
    includePending?: boolean;
    groupByStatus?: boolean;
  }) {
    let statusFilter = options?.includeInProgress && options?.includePending 
      ? undefined 
      : options?.includeInProgress 
        ? eq(receivingOrders.status, 'in_progress')
        : options?.includePending
          ? eq(receivingOrders.status, 'pending')
          : undefined;

    const receivings = await this.db
      .select()
      .from(receivingOrders)
      .where(
        and(
          eq(receivingOrders.warehouseId, warehouseId),
          between(receivingOrders.createdAt, startDate, endDate),
          statusFilter
        )
      );

    const trackingData = receivings.map((r) => {
      const timeline = this.buildReceivingTimeline(r);
      const currentStep = this.getCurrentStep(r.status);
      const estimatedCompletion = this.estimateCompletion(r);

      return {
        receivingOrderId: r.id,
        receivingNumber: r.receivingNumber,
        poNumber: r.poNumber,
        supplier: r.supplier,
        status: r.status,
        currentStep,
        progress: this.calculateProgress(r.status),
        createdAt: r.createdAt,
        receivedDate: r.receivedDate,
        expectedDeliveryDate: r.metadata?.expectedDeliveryDate,
        actualDeliveryDate: r.metadata?.actualDeliveryDate,
        delayDays: this.calculateDelayDays(r.metadata?.expectedDeliveryDate, r.metadata?.actualDeliveryDate),
        timeline,
        estimatedCompletion,
        assignedTo: r.receivedBy,
        priority: r.metadata?.priority || 'normal',
        alerts: this.generateAlerts(r),
      };
    });

    const statusGroups = options?.groupByStatus ? this.groupByStatus(trackingData) : undefined;

    return {
      warehouseId,
      period: { startDate, endDate },
      totalOrders: trackingData.length,
      byStatus: {
        pending: trackingData.filter(t => t.status === 'pending').length,
        inProgress: trackingData.filter(t => t.status === 'in_progress').length,
        completed: trackingData.filter(t => t.status === 'completed').length,
        delayed: trackingData.filter(t => t.delayDays > 0).length,
      },
      avgProgress: trackingData.reduce((sum, t) => sum + t.progress, 0) / trackingData.length,
      statusGroups,
      trackingData,
      generatedAt: new Date(),
      reportType: 'tracking',
    };
  }

  /**
   * Rejected Pallets Report (Reddedilen Paletler Raporu)
   * Detailed analysis of rejected pallets during receiving
   */
  async rejectedPalletsReport(warehouseId: string, startDate: Date, endDate: Date, options?: {
    rejectionReason?: string;
    supplierId?: string;
    includePhotos?: boolean;
    minRejectionValue?: number;
  }) {
    const allReceivings = await this.db
      .select()
      .from(receivingOrders)
      .where(
        and(
          eq(receivingOrders.warehouseId, warehouseId),
          between(receivingOrders.createdAt, startDate, endDate)
        )
      );

    const rejectedPallets: any[] = [];

    for (const receiving of allReceivings) {
      const rejectedItems = receiving.metadata?.rejectedItems || [];
      
      for (const item of rejectedItems) {
        rejectedPallets.push({
          receivingOrderId: receiving.id,
          receivingNumber: receiving.receivingNumber,
          poNumber: receiving.poNumber,
          supplier: receiving.supplier,
          palletId: item.palletId,
          productId: item.productId,
          sku: item.sku,
          productName: item.productName,
          quantity: item.quantity,
          rejectionReason: item.rejectionReason,
          rejectionDate: item.rejectionDate || receiving.receivedDate,
          rejectedBy: item.rejectedBy || receiving.receivedBy,
          damageType: item.damageType,
          damageDescription: item.damageDescription,
          photoUrls: options?.includePhotos ? item.photoUrls : undefined,
          estimatedValue: item.estimatedValue || 0,
          actionTaken: item.actionTaken || 'pending',
          returnToSupplier: item.returnToSupplier || false,
          creditRequested: item.creditRequested || false,
          disposition: item.disposition,
        });
      }
    }

    let filteredPallets = rejectedPallets;

    if (options?.rejectionReason) {
      filteredPallets = filteredPallets.filter(p => p.rejectionReason === options.rejectionReason);
    }

    if (options?.supplierId) {
      filteredPallets = filteredPallets.filter(p => p.supplier === options.supplierId);
    }

    if (options?.minRejectionValue) {
      filteredPallets = filteredPallets.filter(p => p.estimatedValue >= options.minRejectionValue);
    }

    const summary = {
      totalRejected: filteredPallets.length,
      totalQuantity: filteredPallets.reduce((sum, p) => sum + p.quantity, 0),
      totalValue: filteredPallets.reduce((sum, p) => sum + p.estimatedValue, 0),
      byReason: this.groupByRejectionReason(filteredPallets),
      bySupplier: this.groupRejectionsBySupplier(filteredPallets),
      byDamageType: this.groupByDamageType(filteredPallets),
      byAction: {
        pending: filteredPallets.filter(p => p.actionTaken === 'pending').length,
        returnToSupplier: filteredPallets.filter(p => p.returnToSupplier).length,
        creditIssued: filteredPallets.filter(p => p.creditRequested).length,
        disposed: filteredPallets.filter(p => p.disposition === 'disposed').length,
        reworked: filteredPallets.filter(p => p.disposition === 'reworked').length,
      },
      rejectionRate: this.calculateRejectionRate(allReceivings, filteredPallets),
    };

    return {
      warehouseId,
      period: { startDate, endDate },
      summary,
      rejectedPallets: filteredPallets.sort((a, b) => b.estimatedValue - a.estimatedValue),
      topReasons: this.getTopRejectionReasons(filteredPallets, 10),
      worstSuppliers: this.getWorstSuppliers(filteredPallets, 10),
      recommendations: this.generateRejectionRecommendations(summary),
      generatedAt: new Date(),
      reportType: 'rejected_pallets',
    };
  }

  /**
   * Receiving Serial Tracking Report
   * Track serial numbers during receiving process
   */
  async receivingSerialTrackingReport(warehouseId: string, startDate: Date, endDate: Date, options?: {
    productId?: string;
    lotNumber?: string;
    serialNumber?: string;
  }) {
    const receivings = await this.db
      .select()
      .from(receivingOrders)
      .where(
        and(
          eq(receivingOrders.warehouseId, warehouseId),
          between(receivingOrders.createdAt, startDate, endDate)
        )
      );

    const serialNumbers: any[] = [];

    for (const receiving of receivings) {
      const items = receiving.metadata?.items || [];
      
      for (const item of items) {
        if (item.serialNumbers && item.serialNumbers.length > 0) {
          item.serialNumbers.forEach((serial: string) => {
            serialNumbers.push({
              receivingOrderId: receiving.id,
              receivingNumber: receiving.receivingNumber,
              poNumber: receiving.poNumber,
              productId: item.productId,
              sku: item.sku,
              productName: item.productName,
              serialNumber: serial,
              lotNumber: item.lotNumber,
              receivedDate: receiving.receivedDate,
              locationAssigned: item.locationId,
              status: 'received',
              qualityChecked: item.qualityChecked || false,
              warrantyStartDate: receiving.receivedDate,
              warrantyEndDate: this.calculateWarrantyEnd(receiving.receivedDate, item.warrantyMonths || 12),
            });
          });
        }
      }
    }

    let filtered = serialNumbers;

    if (options?.productId) {
      filtered = filtered.filter(s => s.productId === options.productId);
    }

    if (options?.lotNumber) {
      filtered = filtered.filter(s => s.lotNumber === options.lotNumber);
    }

    if (options?.serialNumber) {
      filtered = filtered.filter(s => s.serialNumber.includes(options.serialNumber!));
    }

    return {
      warehouseId,
      period: { startDate, endDate },
      totalItems: filtered.length,
      uniqueProducts: new Set(filtered.map(s => s.productId)).size,
      uniqueLots: new Set(filtered.map(s => s.lotNumber)).size,
      serialNumbers: filtered,
      byProduct: this.groupSerialsByProduct(filtered),
      byLot: this.groupSerialsByLot(filtered),
      qualityMetrics: {
        checked: filtered.filter(s => s.qualityChecked).length,
        notChecked: filtered.filter(s => !s.qualityChecked).length,
      },
      generatedAt: new Date(),
      reportType: 'serial_tracking',
    };
  }

  /**
   * Receiving Invoice Report
   * Match receiving with invoice data
   */
  async receivingInvoiceReport(receivingOrderId: string, options?: {
    includeDiscrepancies?: boolean;
    includeTaxDetails?: boolean;
  }) {
    const [receiving] = await this.db
      .select()
      .from(receivingOrders)
      .where(eq(receivingOrders.id, receivingOrderId))
      .limit(1);

    if (!receiving) {
      throw new Error('Receiving order not found');
    }

    const items = receiving.metadata?.items || [];
    const invoice = receiving.metadata?.invoice || {};

    const lineItems = items.map((item: any) => {
      const unitPrice = invoice.lineItems?.find((li: any) => li.productId === item.productId)?.unitPrice || 0;
      const invoicedQty = invoice.lineItems?.find((li: any) => li.productId === item.productId)?.quantity || 0;
      const discrepancy = item.quantity - invoicedQty;

      return {
        productId: item.productId,
        sku: item.sku,
        productName: item.productName,
        receivedQuantity: item.quantity,
        invoicedQuantity: invoicedQty,
        discrepancy,
        unitPrice,
        lineTotal: invoicedQty * unitPrice,
        taxRate: item.taxRate || 0,
        taxAmount: (invoicedQty * unitPrice) * (item.taxRate || 0) / 100,
        hasDiscrepancy: discrepancy !== 0,
      };
    });

    const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalTax = lineItems.reduce((sum, item) => sum + item.taxAmount, 0);
    const total = subtotal + totalTax;

    const discrepancies = options?.includeDiscrepancies 
      ? lineItems.filter(item => item.hasDiscrepancy)
      : undefined;

    return {
      receivingOrderId,
      receivingNumber: receiving.receivingNumber,
      poNumber: receiving.poNumber,
      supplier: receiving.supplier,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      paymentTerms: invoice.paymentTerms,
      currency: invoice.currency || 'TRY',
      lineItems,
      subtotal,
      totalTax,
      total,
      discrepancies,
      discrepancyCount: lineItems.filter(item => item.hasDiscrepancy).length,
      discrepancyValue: discrepancies ? discrepancies.reduce((sum, d) => sum + Math.abs(d.discrepancy * d.unitPrice), 0) : 0,
      taxDetails: options?.includeTaxDetails ? this.calculateTaxDetails(lineItems) : undefined,
      paymentStatus: invoice.paymentStatus || 'pending',
      generatedAt: new Date(),
      reportType: 'invoice',
    };
  }

  /**
   * Receiving Performance Report
   * Analyze receiving efficiency and performance
   */
  async receivingPerformanceReport(warehouseId: string, startDate: Date, endDate: Date) {
    const receivings = await this.db
      .select()
      .from(receivingOrders)
      .where(
        and(
          eq(receivingOrders.warehouseId, warehouseId),
          between(receivingOrders.createdAt, startDate, endDate)
        )
      );

    const completed = receivings.filter(r => r.status === 'completed');

    const performanceMetrics = {
      totalOrders: receivings.length,
      completedOrders: completed.length,
      completionRate: receivings.length > 0 ? (completed.length / receivings.length) * 100 : 0,
      avgReceivingTime: this.calculateAverageReceivingTime(completed),
      onTimeReceivings: completed.filter(r => this.isOnTime(r)).length,
      onTimeRate: completed.length > 0 ? (completed.filter(r => this.isOnTime(r)).length / completed.length) * 100 : 0,
      totalQuantityReceived: this.sumTotalQuantity(completed),
      avgQuantityPerOrder: this.sumTotalQuantity(completed) / (completed.length || 1),
      throughputPerHour: this.calculateThroughput(completed, startDate, endDate),
      accuracyRate: this.calculateAccuracyRate(completed),
      byReceiver: this.groupByReceiver(completed),
      byDayOfWeek: this.groupByDayOfWeek(completed),
      byHourOfDay: this.groupByHourOfDay(completed),
      peakHours: this.identifyPeakHours(completed),
      bottlenecks: this.identifyBottlenecks(completed),
    };

    return {
      warehouseId,
      period: { startDate, endDate },
      metrics: performanceMetrics,
      generatedAt: new Date(),
      reportType: 'performance',
    };
  }

  // Helper methods
  private async getReceivingItems(receivingOrderId: string): Promise<any[]> {
    return [];
  }

  private calculateDuration(startDate: Date, endDate: Date | null): number {
    if (!endDate) return 0;
    return Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60));
  }

  private calculateAverageMinutes(durations: number[]): number {
    if (durations.length === 0) return 0;
    return durations.reduce((sum, d) => sum + d, 0) / durations.length;
  }

  private groupBySupplier(receivings: any[]): any {
    const bySupplier: Record<string, any> = {};
    receivings.forEach(r => {
      const supplier = r.supplier || 'Unknown';
      if (!bySupplier[supplier]) bySupplier[supplier] = { supplier, count: 0, totalQuantity: 0 };
      bySupplier[supplier].count++;
      bySupplier[supplier].totalQuantity += r.totalQuantity;
    });
    return Object.values(bySupplier).sort((a: any, b: any) => b.count - a.count);
  }

  private groupByDay(receivings: any[], startDate: Date, endDate: Date): any {
    return [];
  }

  private groupByReceivingType(receivings: any[]): any {
    return [];
  }

  private buildReceivingTimeline(receiving: any): any[] {
    return [
      { step: 'created', timestamp: receiving.createdAt, completed: true },
      { step: 'received', timestamp: receiving.receivedDate, completed: !!receiving.receivedDate },
      { step: 'quality_check', timestamp: receiving.metadata?.qualityCheckDate, completed: !!receiving.metadata?.qualityCheckDate },
      { step: 'putaway', timestamp: receiving.metadata?.putawayDate, completed: !!receiving.metadata?.putawayDate },
    ];
  }

  private getCurrentStep(status: string): string {
    const stepMap: Record<string, string> = {
      'pending': 'awaiting_arrival',
      'in_progress': 'receiving_in_progress',
      'quality_check': 'quality_inspection',
      'putaway': 'putaway_in_progress',
      'completed': 'completed',
    };
    return stepMap[status] || status;
  }

  private estimateCompletion(receiving: any): Date | null {
    if (receiving.status === 'completed') return receiving.receivedDate;
    const avgDuration = 120;
    return new Date(new Date(receiving.createdAt).getTime() + avgDuration * 60 * 1000);
  }

  private calculateProgress(status: string): number {
    const progressMap: Record<string, number> = {
      'pending': 10,
      'in_progress': 50,
      'quality_check': 75,
      'putaway': 90,
      'completed': 100,
    };
    return progressMap[status] || 0;
  }

  private calculateDelayDays(expectedDate: Date | undefined, actualDate: Date | undefined): number {
    if (!expectedDate || !actualDate) return 0;
    const diff = new Date(actualDate).getTime() - new Date(expectedDate).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }

  private generateAlerts(receiving: any): string[] {
    const alerts = [];
    if (receiving.status === 'pending' && this.calculateDelayDays(receiving.metadata?.expectedDeliveryDate, new Date()) > 0) {
      alerts.push('Overdue');
    }
    if (receiving.metadata?.qualityCheckPassed === false) {
      alerts.push('Failed quality check');
    }
    return alerts;
  }

  private groupByStatus(trackingData: any[]): any {
    const byStatus: Record<string, any[]> = {};
    trackingData.forEach(t => {
      if (!byStatus[t.status]) byStatus[t.status] = [];
      byStatus[t.status].push(t);
    });
    return byStatus;
  }

  private groupByRejectionReason(pallets: any[]): any {
    const byReason: Record<string, any> = {};
    pallets.forEach(p => {
      const reason = p.rejectionReason || 'Unknown';
      if (!byReason[reason]) byReason[reason] = { reason, count: 0, totalValue: 0 };
      byReason[reason].count++;
      byReason[reason].totalValue += p.estimatedValue;
    });
    return Object.values(byReason).sort((a: any, b: any) => b.count - a.count);
  }

  private groupRejectionsBySupplier(pallets: any[]): any {
    const bySupplier: Record<string, any> = {};
    pallets.forEach(p => {
      const supplier = p.supplier || 'Unknown';
      if (!bySupplier[supplier]) bySupplier[supplier] = { supplier, count: 0, totalValue: 0 };
      bySupplier[supplier].count++;
      bySupplier[supplier].totalValue += p.estimatedValue;
    });
    return Object.values(bySupplier).sort((a: any, b: any) => b.count - a.count);
  }

  private groupByDamageType(pallets: any[]): any {
    const byType: Record<string, number> = {};
    pallets.forEach(p => {
      const type = p.damageType || 'Unknown';
      byType[type] = (byType[type] || 0) + 1;
    });
    return Object.entries(byType).map(([type, count]) => ({ type, count }));
  }

  private calculateRejectionRate(allReceivings: any[], rejectedPallets: any[]): number {
    const totalPallets = allReceivings.reduce((sum, r) => sum + (r.metadata?.totalPallets || 0), 0);
    return totalPallets > 0 ? (rejectedPallets.length / totalPallets) * 100 : 0;
  }

  private getTopRejectionReasons(pallets: any[], limit: number): any[] {
    const byReason = this.groupByRejectionReason(pallets);
    return byReason.slice(0, limit);
  }

  private getWorstSuppliers(pallets: any[], limit: number): any[] {
    const bySupplier = this.groupRejectionsBySupplier(pallets);
    return bySupplier.slice(0, limit);
  }

  private generateRejectionRecommendations(summary: any): string[] {
    const recommendations = [];
    if (summary.rejectionRate > 5) {
      recommendations.push('High rejection rate detected. Review supplier quality standards.');
    }
    if (summary.totalValue > 10000) {
      recommendations.push('Significant value in rejections. Consider implementing stricter pre-shipment inspections.');
    }
    return recommendations;
  }

  private groupSerialsByProduct(serialNumbers: any[]): any {
    const byProduct: Record<string, any> = {};
    serialNumbers.forEach(s => {
      if (!byProduct[s.productId]) {
        byProduct[s.productId] = { productId: s.productId, sku: s.sku, count: 0, serials: [] };
      }
      byProduct[s.productId].count++;
      byProduct[s.productId].serials.push(s.serialNumber);
    });
    return Object.values(byProduct);
  }

  private groupSerialsByLot(serialNumbers: any[]): any {
    const byLot: Record<string, any> = {};
    serialNumbers.forEach(s => {
      const lot = s.lotNumber || 'No Lot';
      if (!byLot[lot]) byLot[lot] = { lotNumber: lot, count: 0 };
      byLot[lot].count++;
    });
    return Object.values(byLot);
  }

  private calculateWarrantyEnd(startDate: Date, months: number): Date {
    const end = new Date(startDate);
    end.setMonth(end.getMonth() + months);
    return end;
  }

  private calculateTaxDetails(lineItems: any[]): any {
    const byTaxRate: Record<number, any> = {};
    lineItems.forEach(item => {
      const rate = item.taxRate;
      if (!byTaxRate[rate]) byTaxRate[rate] = { taxRate: rate, subtotal: 0, taxAmount: 0 };
      byTaxRate[rate].subtotal += item.lineTotal;
      byTaxRate[rate].taxAmount += item.taxAmount;
    });
    return Object.values(byTaxRate);
  }

  private calculateAverageReceivingTime(receivings: any[]): number {
    const durations = receivings.map(r => this.calculateDuration(r.createdAt, r.receivedDate));
    return this.calculateAverageMinutes(durations);
  }

  private isOnTime(receiving: any): boolean {
    if (!receiving.metadata?.expectedDeliveryDate || !receiving.receivedDate) return true;
    return new Date(receiving.receivedDate) <= new Date(receiving.metadata.expectedDeliveryDate);
  }

  private sumTotalQuantity(receivings: any[]): number {
    return receivings.reduce((sum, r) => sum + (r.metadata?.totalQuantity || 0), 0);
  }

  private calculateThroughput(receivings: any[], startDate: Date, endDate: Date): number {
    const hours = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60);
    const totalQty = this.sumTotalQuantity(receivings);
    return hours > 0 ? totalQty / hours : 0;
  }

  private calculateAccuracyRate(receivings: any[]): number {
    const withDiscrepancies = receivings.filter(r => r.metadata?.hasDiscrepancies).length;
    return receivings.length > 0 ? ((receivings.length - withDiscrepancies) / receivings.length) * 100 : 100;
  }

  private groupByReceiver(receivings: any[]): any {
    const byReceiver: Record<string, any> = {};
    receivings.forEach(r => {
      const receiver = r.receivedBy || 'Unknown';
      if (!byReceiver[receiver]) byReceiver[receiver] = { receiver, count: 0 };
      byReceiver[receiver].count++;
    });
    return Object.values(byReceiver).sort((a: any, b: any) => b.count - a.count);
  }

  private groupByDayOfWeek(receivings: any[]): any {
    const byDay: Record<number, any> = {};
    receivings.forEach(r => {
      const day = new Date(r.receivedDate).getDay();
      if (!byDay[day]) byDay[day] = { day, dayName: this.getDayName(day), count: 0 };
      byDay[day].count++;
    });
    return Object.values(byDay);
  }

  private groupByHourOfDay(receivings: any[]): any {
    const byHour: Record<number, any> = {};
    receivings.forEach(r => {
      const hour = new Date(r.receivedDate).getHours();
      if (!byHour[hour]) byHour[hour] = { hour, count: 0 };
      byHour[hour].count++;
    });
    return Object.values(byHour);
  }

  private identifyPeakHours(receivings: any[]): any {
    const byHour = this.groupByHourOfDay(receivings);
    return byHour.sort((a: any, b: any) => b.count - a.count).slice(0, 3);
  }

  private identifyBottlenecks(receivings: any[]): string[] {
    const bottlenecks = [];
    const avgTime = this.calculateAverageReceivingTime(receivings);
    if (avgTime > 180) {
      bottlenecks.push('High average receiving time');
    }
    return bottlenecks;
  }

  private getDayName(day: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  }
}


