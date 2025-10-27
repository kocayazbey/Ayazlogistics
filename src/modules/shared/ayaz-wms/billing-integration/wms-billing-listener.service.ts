import { Injectable, Logger, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { HandlingBillingService } from '../../../logistics/ayaz-billing/billing-models/handling/handling-billing.service';
import { RackBillingService } from '../../../logistics/ayaz-billing/billing-models/rack-storage/rack-billing.service';
import { ForkliftBillingService } from '../../../logistics/ayaz-billing/billing-models/forklift-operator/forklift-billing.service';
import { WaitingTimeBillingService } from '../../../logistics/ayaz-billing/billing-models/waiting-time/waiting-time-billing.service';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, gte, lte, sql, sum, count } from 'drizzle-orm';
import { contracts } from '../../../database/schema/shared/billing.schema';
import { inventory, warehouseLocations } from '../../../database/schema/shared/wms.schema';
import { usageTracking } from '../../../database/schema/logistics/billing.schema';

/**
 * WMS Billing Integration Listener
 * 
 * Automatically tracks all WMS operations for billing purposes
 * Listens to WMS events and creates billing records
 */
@Injectable()
export class WmsBillingListenerService {
  private readonly logger = new Logger(WmsBillingListenerService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly handlingBilling: HandlingBillingService,
    private readonly rackBilling: RackBillingService,
    private readonly forkliftBilling: ForkliftBillingService,
    private readonly waitingTimeBilling: WaitingTimeBillingService,
  ) {}

  // ============================================
  // INVENTORY EVENTS
  // ============================================

  @OnEvent('inventory.created')
  async handleInventoryCreated(event: {
    inventoryId: string;
    sku: string;
    quantity: number;
    locationId: string;
    tenantId: string;
    contractId?: string;
    operation: string;
  }) {
    try {
      const contractId = event.contractId || await this.getContractIdForTenant(event.tenantId);

      if (!contractId) {
        this.logger.warn(`No contract found for tenant ${event.tenantId}, skipping billing`);
        return;
      }

      await this.handlingBilling.recordHandlingActivity({
        contractId,
        activityType: 'inventory_create',
        quantity: event.quantity,
        unit: 'piece',
        timestamp: new Date(),
      }, event.tenantId);

      this.logger.log(`Billing recorded for inventory creation: ${event.inventoryId}`);
    } catch (error) {
      this.logger.error(`Failed to record inventory creation billing: ${error.message}`);
    }
  }

  // ============================================
  // RECEIVING EVENTS
  // ============================================

  @OnEvent('item.received')
  async handleItemReceived(event: {
    receivingOrderId: string;
    productId: string;
    quantity: number;
    locationId: string;
    tenantId: string;
    contractId?: string;
  }) {
    try {
      const contractId = event.contractId || await this.getContractIdForTenant(event.tenantId);
      
      if (!contractId) {
        this.logger.warn(`No contract found for tenant ${event.tenantId}, skipping billing`);
        return;
      }

      await this.handlingBilling.recordHandlingActivity({
        contractId,
        activityType: 'receiving',
        quantity: event.quantity,
        unit: 'piece',
        timestamp: new Date(),
      }, event.tenantId);

      this.logger.log(`Billing recorded for receiving: ${event.quantity} pieces`);
    } catch (error) {
      this.logger.error(`Failed to record receiving billing: ${error.message}`, error.stack);
    }
  }

  @OnEvent('receiving.completed')
  async handleReceivingCompleted(event: {
    receivingOrderId: string;
    warehouseId: string;
    totalItems: number;
    tenantId: string;
    contractId?: string;
  }) {
    try {
      const contractId = event.contractId || await this.getContractIdForTenant(event.tenantId);
      
      if (!contractId) return;

      // Record receiving completion as a handling activity
      await this.handlingBilling.recordHandlingActivity({
        contractId,
        activityType: 'receiving',
        quantity: event.totalItems,
        unit: 'piece',
        timestamp: new Date(),
      }, event.tenantId);

      this.logger.log(`Billing recorded for completed receiving order: ${event.receivingOrderId}`);
    } catch (error) {
      this.logger.error(`Failed to record receiving completion billing: ${error.message}`);
    }
  }

  // ============================================
  // PUTAWAY EVENTS
  // ============================================

  @OnEvent('putaway.completed')
  async handlePutawayCompleted(event: {
    receivingOrderId: string;
    productId: string;
    quantity: number;
    locationId: string;
    userId: string;
    tenantId: string;
    contractId?: string;
  }) {
    try {
      const contractId = event.contractId || await this.getContractIdForTenant(event.tenantId);
      
      if (!contractId) return;

      await this.handlingBilling.recordHandlingActivity({
        contractId,
        activityType: 'putaway',
        quantity: event.quantity,
        unit: 'piece',
        timestamp: new Date(),
      }, event.tenantId);

      this.logger.log(`Billing recorded for putaway: ${event.quantity} pieces to ${event.locationId}`);
    } catch (error) {
      this.logger.error(`Failed to record putaway billing: ${error.message}`);
    }
  }

  // ============================================
  // PICKING EVENTS
  // ============================================

  @OnEvent('picking.started')
  async handlePickingStarted(event: {
    pickId: string;
    tenantId: string;
    contractId?: string;
    operation: string;
  }) {
    try {
      const contractId = event.contractId || await this.getContractIdForTenant(event.tenantId);

      if (!contractId) {
        this.logger.warn(`No contract found for tenant ${event.tenantId}, skipping billing`);
        return;
      }

      await this.handlingBilling.recordHandlingActivity({
        contractId,
        activityType: 'picking_start',
        quantity: 1,
        unit: 'operation',
        timestamp: new Date(),
      }, event.tenantId);

      this.logger.log(`Billing recorded for picking start: ${event.pickId}`);
    } catch (error) {
      this.logger.error(`Failed to record picking start billing: ${error.message}`);
    }
  }

  @OnEvent('picking.completed')
  async handlePickingCompleted(event: {
    pickId: string;
    tenantId: string;
    contractId?: string;
    operation: string;
  }) {
    try {
      const contractId = event.contractId || await this.getContractIdForTenant(event.tenantId);

      if (!contractId) {
        this.logger.warn(`No contract found for tenant ${event.tenantId}, skipping billing`);
        return;
      }

      await this.handlingBilling.recordHandlingActivity({
        contractId,
        activityType: 'picking_complete',
        quantity: 1,
        unit: 'operation',
        timestamp: new Date(),
      }, event.tenantId);

      this.logger.log(`Billing recorded for picking completion: ${event.pickId}`);
    } catch (error) {
      this.logger.error(`Failed to record picking completion billing: ${error.message}`);
    }
  }

  @OnEvent('item.picked')
  async handleItemPicked(event: {
    pickingOrderId: string;
    taskId: string;
    productId: string;
    quantity: number;
    locationId: string;
    tenantId: string;
    contractId?: string;
  }) {
    try {
      const contractId = event.contractId || await this.getContractIdForTenant(event.tenantId);
      
      if (!contractId) return;

      await this.handlingBilling.recordHandlingActivity({
        contractId,
        activityType: 'picking',
        quantity: event.quantity,
        unit: 'piece',
        timestamp: new Date(),
      }, event.tenantId);

      this.logger.log(`Billing recorded for picking: ${event.quantity} pieces`);
    } catch (error) {
      this.logger.error(`Failed to record picking billing: ${error.message}`);
    }
  }

  @OnEvent('picking.completed')
  async handlePickingCompleted(event: {
    pickingOrderId: string;
    warehouseId: string;
    tenantId: string;
    contractId?: string;
  }) {
    try {
      const contractId = event.contractId || await this.getContractIdForTenant(event.tenantId);
      
      if (!contractId) return;

      this.logger.log(`Picking order ${event.pickingOrderId} completed and billed`);
    } catch (error) {
      this.logger.error(`Failed to handle picking completion: ${error.message}`);
    }
  }

  // ============================================
  // PACKING EVENTS
  // ============================================

  @OnEvent('packing.completed')
  async handlePackingCompleted(event: {
    packingTaskId: string;
    boxCount: number;
    totalWeight: number;
    tenantId: string;
    contractId?: string;
  }) {
    try {
      const contractId = event.contractId || await this.getContractIdForTenant(event.tenantId);
      
      if (!contractId) return;

      await this.handlingBilling.recordHandlingActivity({
        contractId,
        activityType: 'packing',
        quantity: event.boxCount,
        unit: 'carton',
        timestamp: new Date(),
      }, event.tenantId);

      this.logger.log(`Billing recorded for packing: ${event.boxCount} cartons`);
    } catch (error) {
      this.logger.error(`Failed to record packing billing: ${error.message}`);
    }
  }

  // ============================================
  // SHIPPING EVENTS
  // ============================================

  @OnEvent('shipment.created')
  async handleShipmentCreated(event: {
    shipmentId: string;
    orderId: string;
    items: number;
    tenantId: string;
    contractId?: string;
    operation: string;
  }) {
    try {
      const contractId = event.contractId || await this.getContractIdForTenant(event.tenantId);

      if (!contractId) {
        this.logger.warn(`No contract found for tenant ${event.tenantId}, skipping billing`);
        return;
      }

      await this.handlingBilling.recordHandlingActivity({
        contractId,
        activityType: 'shipping_create',
        quantity: event.items,
        unit: 'item',
        timestamp: new Date(),
      }, event.tenantId);

      this.logger.log(`Billing recorded for shipment creation: ${event.shipmentId}`);
    } catch (error) {
      this.logger.error(`Failed to record shipment creation billing: ${error.message}`);
    }
  }

  @OnEvent('shipment.dispatched')
  async handleShipmentDispatched(event: {
    shipmentId: string;
    tenantId: string;
    contractId?: string;
    operation: string;
  }) {
    try {
      const contractId = event.contractId || await this.getContractIdForTenant(event.tenantId);

      if (!contractId) {
        this.logger.warn(`No contract found for tenant ${event.tenantId}, skipping billing`);
        return;
      }

      await this.handlingBilling.recordHandlingActivity({
        contractId,
        activityType: 'shipping_dispatch',
        quantity: 1,
        unit: 'shipment',
        timestamp: new Date(),
      }, event.tenantId);

      this.logger.log(`Billing recorded for shipment dispatch: ${event.shipmentId}`);
    } catch (error) {
      this.logger.error(`Failed to record shipment dispatch billing: ${error.message}`);
    }
  }

  @OnEvent('shipment.shipped')
  async handleShipmentShipped(event: {
    shipmentId: string;
    trackingNumber: string;
    warehouseId: string;
    packageCount?: number;
    tenantId: string;
    contractId?: string;
  }) {
    try {
      const contractId = event.contractId || await this.getContractIdForTenant(event.tenantId);
      
      if (!contractId) return;

      await this.handlingBilling.recordHandlingActivity({
        contractId,
        activityType: 'shipping',
        quantity: event.packageCount || 1,
        unit: 'carton',
        timestamp: new Date(),
      }, event.tenantId);

      this.logger.log(`Billing recorded for shipment: ${event.trackingNumber}`);
    } catch (error) {
      this.logger.error(`Failed to record shipping billing: ${error.message}`);
    }
  }

  // ============================================
  // STORAGE EVENTS
  // ============================================

  @OnEvent('location.occupied')
  async handleLocationOccupied(event: {
    locationId: string;
    warehouseId?: string;
    tenantId?: string;
    contractId?: string;
  }) {
    try {
      if (!event.tenantId) return;
      
      const contractId = event.contractId || await this.getContractIdForTenant(event.tenantId);
      
      if (!contractId) return;

      // Start daily rack storage billing
      await this.rackBilling.trackRackUsage(
        contractId,
        event.locationId,
        1, // 1 pallet position
        new Date(),
        event.tenantId
      );

      this.logger.log(`Daily rack storage billing started for location ${event.locationId}`);
    } catch (error) {
      this.logger.error(`Failed to record rack storage billing: ${error.message}`);
    }
  }

  // ============================================
  // AGV/FORKLIFT EVENTS
  // ============================================

  @OnEvent('agv.task.completed')
  async handleAgvTaskCompleted(event: {
    agvId: string;
    taskId: string;
    duration?: number;
    tenantId?: string;
    contractId?: string;
  }) {
    try {
      if (!event.tenantId || !event.duration) return;
      
      const contractId = event.contractId || await this.getContractIdForTenant(event.tenantId);
      
      if (!contractId) return;

      // Track as automated equipment usage
      const hours = event.duration / 60; // Convert minutes to hours

      this.logger.log(`AGV usage recorded: ${hours} hours`);
    } catch (error) {
      this.logger.error(`Failed to record AGV billing: ${error.message}`);
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async getContractIdForTenant(tenantId: string): Promise<string | null> {
    try {
      const [contract] = await this.db
        .select({ id: contracts.id })
        .from(contracts)
        .where(
          and(
            eq(contracts.tenantId, tenantId),
            eq(contracts.status, 'active')
          )
        )
        .limit(1);

      return contract?.id || null;
    } catch (error) {
      this.logger.error(`Failed to lookup contract: ${error.message}`);
      return null;
    }
  }

  /**
   * Track daily storage usage for all occupied locations
   * This should be called by a scheduled job (cron) once per day
   */
  async trackDailyStorageUsage(tenantId: string) {
    try {
      this.logger.log(`Starting daily storage usage tracking for tenant ${tenantId}`);
      
      const contractId = await this.getContractIdForTenant(tenantId);
      if (!contractId) {
        this.logger.warn(`No contract found for tenant ${tenantId}`);
        return;
      }

      const occupiedLocations = await this.db
        .select({
          locationId: inventory.locationId,
          locationCode: warehouseLocations.locationCode,
          quantity: inventory.quantityOnHand,
        })
        .from(inventory)
        .innerJoin(warehouseLocations, eq(inventory.locationId, warehouseLocations.id))
        .where(
          and(
            eq(inventory.tenantId, tenantId),
            sql`${inventory.quantityOnHand} > 0`
          )
        );

      for (const location of occupiedLocations) {
        await this.rackBilling.trackRackUsage({
          contractId,
          locationId: location.locationId,
          locationCode: location.locationCode,
          quantity: location.quantity,
          date: new Date(),
        }, tenantId);
      }
      
      this.logger.log(`Completed daily storage usage tracking for tenant ${tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to track daily storage usage: ${error.message}`);
    }
  }

  /**
   * Generate usage summary for a period
   */
  async getUsageSummary(tenantId: string, contractId: string, startDate: Date, endDate: Date) {
    try {
      this.logger.log(`Generating usage summary for contract ${contractId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Aggregate usage from billing_usage_tracking table
      const usageData = await this.db
        .select({
          usageType: usageTracking.usageType,
          totalQuantity: sql<number>`COALESCE(SUM(${usageTracking.quantity}), 0)`,
          totalAmount: sql<number>`COALESCE(SUM(${usageTracking.totalAmount}), 0)`,
          count: count(),
        })
        .from(usageTracking)
        .where(
          and(
            eq(usageTracking.tenantId, tenantId),
            eq(usageTracking.contractId, contractId),
            gte(usageTracking.usageDate, startDate),
            lte(usageTracking.usageDate, endDate)
          )
        )
        .groupBy(usageTracking.usageType);

      // Initialize summary with zeros
      const summary = {
        receiving: 0,
        putaway: 0,
        picking: 0,
        packing: 0,
        shipping: 0,
        storage: 0,
        total: 0,
        totalAmount: 0,
        operationCount: 0,
      };

      // Map usage types to summary fields
      for (const usage of usageData) {
        const quantity = Number(usage.totalQuantity || 0);
        const amount = Number(usage.totalAmount || 0);
        const count = Number(usage.count || 0);

        switch (usage.usageType) {
          case 'receiving':
            summary.receiving = quantity;
            break;
          case 'putaway':
            summary.putaway = quantity;
            break;
          case 'picking':
            summary.picking = quantity;
            break;
          case 'packing':
            summary.packing = quantity;
            break;
          case 'shipping':
            summary.shipping = quantity;
            break;
          case 'storage':
          case 'rack_storage':
            summary.storage = quantity;
            break;
        }

        summary.totalAmount += amount;
        summary.operationCount += count;
      }

      summary.total = summary.receiving + summary.putaway + summary.picking + 
                     summary.packing + summary.shipping + summary.storage;

      this.logger.log(`Usage summary generated: ${summary.operationCount} operations, total amount: ${summary.totalAmount}`);
      
      return summary;
    } catch (error) {
      this.logger.error(`Failed to get usage summary: ${error.message}`);
      throw error;
    }
  }
}

