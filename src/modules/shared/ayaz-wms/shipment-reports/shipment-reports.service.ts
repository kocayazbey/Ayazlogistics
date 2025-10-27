import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, between, and } from 'drizzle-orm';
import { shipments, pickingOrders } from '../../../../database/schema/shared/wms.schema';

@Injectable()
export class ShipmentReportsService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
  ) {}

  async skuShipmentReport(warehouseId: string, startDate: Date, endDate: Date, productId?: string) {
    return { warehouseId, period: { startDate, endDate }, productId, shipments: [], totalQuantity: 0, totalShipments: 0 };
  }

  async actualizedShipmentsList(warehouseId: string, startDate: Date, endDate: Date) {
    const shipped = await this.db.select().from(shipments).where(and(eq(shipments.warehouseId, warehouseId), between(shipments.shippedAt, startDate, endDate)));
    return { warehouseId, period: { startDate, endDate }, shipments: shipped, totalShipments: shipped.length };
  }

  async lotTrackingReport(lotNumber: string, startDate: Date, endDate: Date) {
    return { lotNumber, period: { startDate, endDate }, movements: [], locations: [], currentStock: 0 };
  }

  async loadingListType1(shipmentIds: string[]) {
    return { shipments: shipmentIds, loadingSequence: [], totalPallets: 0, totalWeight: 0, vehicleCapacity: 0 };
  }

  async loadingListType2(shipmentIds: string[]) {
    return { shipments: shipmentIds, byDestination: [], totalStops: 0, optimizedRoute: [] };
  }

  async shipmentFulfillmentReport(warehouseId: string, startDate: Date, endDate: Date) {
    return { warehouseId, period: { startDate, endDate }, totalOrders: 0, fullyFulfilled: 0, partiallyFulfilled: 0, unfulfilled: 0, fillRate: 0 };
  }

  async actualPickingDetailReport(warehouseId: string, startDate: Date, endDate: Date) {
    const picks = await this.db.select().from(pickingOrders).where(and(eq(pickingOrders.warehouseId, warehouseId), between(pickingOrders.createdAt, startDate, endDate)));
    return { warehouseId, period: { startDate, endDate }, pickingOrders: picks, totalLines: 0, totalQuantity: 0 };
  }

  async shipmentInvoiceReport(shipmentId: string) {
    return { shipmentId, invoice: {}, lineItems: [], total: 0, currency: 'TRY' };
  }

  async shipmentSerialNumberReport(shipmentId: string) {
    return { shipmentId, serialNumbers: [], totalItems: 0 };
  }

  async orderFinalCheckReport(orderId: string) {
    return { orderId, checkResults: [], passedChecks: 0, failedChecks: 0, overallStatus: 'pending' };
  }

  async pendingOrdersFulfillmentReport(warehouseId: string) {
    return { warehouseId, pendingOrders: [], totalPending: 0, oldestPending: null };
  }

  async shipmentDetailReport(shipmentId: string) {
    const [shipment] = await this.db.select().from(shipments).where(eq(shipments.id, shipmentId)).limit(1);
    return { shipment, details: {}, packages: [], totalWeight: 0 };
  }

  async packagingListReport(orderId: string) {
    return { orderId, packages: [], totalPackages: 0, packagingMaterials: [] };
  }

  async shipmentBoxListReport(shipmentId: string) {
    return { shipmentId, boxes: [], totalBoxes: 0, totalVolume: 0 };
  }

  async activePassivePickedOrderLines(warehouseId: string, startDate: Date, endDate: Date) {
    return { warehouseId, period: { startDate, endDate }, activeLines: 0, passiveLines: 0, totalLines: 0 };
  }
}

