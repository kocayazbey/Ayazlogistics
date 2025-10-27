import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import { RealtimeEventsService } from '../../../realtime/services/realtime-events.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { CreateReceiptDto, ReceiptItemDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { CreatePickDto, PickItemDto } from './dto/create-pick.dto';
import { UpdatePickDto } from './dto/update-pick.dto';
import { CreateShipmentDto, ShipmentItemDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';

@Injectable()
export class WmsService {
  private readonly logger = new Logger(WmsService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject(DRIZZLE_ORM) private readonly db: any,
    private readonly realtimeEventsService: RealtimeEventsService
  ) {}

  async getInventory(params: {
    page: number;
    limit: number;
    search?: string;
    category?: string;
    status?: string;
  }) {
    const { page, limit, search, category, status } = params;
    
    try {
      // Import database schema
      const { inventory, products, locations, zones } = await import('../../../database/schema/shared/wms.schema');
      const { eq, and, or, like, desc, asc, sql } = await import('drizzle-orm');
      
      // Build where conditions
      const whereConditions = [];
    
    if (search) {
        whereConditions.push(
          or(
            like(products.name, `%${search}%`),
            like(products.sku, `%${search}%`)
          )
        );
      }
      
    if (category) {
        whereConditions.push(eq(products.category, category));
    }
      
    if (status) {
        whereConditions.push(eq(inventory.status, status));
      }

      // Get total count for pagination
      const totalCount = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(inventory)
        .innerJoin(products, eq(inventory.productId, products.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

      // Get paginated inventory data
    const offset = (page - 1) * limit;
      const inventoryData = await this.db
        .select({
          id: inventory.id,
          sku: products.sku,
          name: products.name,
          category: products.category,
          currentStock: inventory.quantityOnHand,
          minStock: inventory.minQuantity,
          maxStock: inventory.maxQuantity,
          unitCost: inventory.unitCost,
          totalValue: sql<number>`${inventory.quantityOnHand} * ${inventory.unitCost}`,
          location: locations.code,
          status: inventory.status,
          supplier: products.supplier,
          lastUpdated: inventory.updatedAt,
          createdAt: inventory.createdAt,
          updatedAt: inventory.updatedAt
        })
        .from(inventory)
        .innerJoin(products, eq(inventory.productId, products.id))
        .leftJoin(locations, eq(inventory.locationId, locations.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(inventory.updatedAt))
        .limit(limit)
        .offset(offset);

    return {
        items: inventoryData,
      pagination: {
        page,
        limit,
          total: totalCount[0]?.count || 0,
          pages: Math.ceil((totalCount[0]?.count || 0) / limit)
      }
    };
    } catch (error) {
      this.logger.error('Error fetching inventory:', error);
      throw new Error('Failed to fetch inventory data');
    }
  }

  async createInventory(createInventoryDto: CreateInventoryDto, tenantId: string) {
    this.logger.log(`Creating inventory item: ${createInventoryDto.sku}`);

    try {
      // Import database schema
      const { inventory, products, locations, zones } = await import('../../../database/schema/shared/wms.schema');
      const { eq } = await import('drizzle-orm');

      // Start transaction
      return await this.db.transaction(async (tx) => {
        // First, create or get product
        let productId: string;
        const existingProduct = await tx
          .select({ id: products.id })
          .from(products)
          .where(eq(products.sku, createInventoryDto.sku))
          .limit(1);

        if (existingProduct.length > 0) {
          productId = existingProduct[0].id;
        } else {
          const newProduct = await tx
            .insert(products)
            .values({
              sku: createInventoryDto.sku,
              name: (createInventoryDto as any).name || createInventoryDto.sku,
              description: (createInventoryDto as any).description,
              category: (createInventoryDto as any).category,
              supplier: (createInventoryDto as any).supplier,
              unitCost: (createInventoryDto as any).unitCost || 0,
              unitPrice: (createInventoryDto as any).unitPrice || 0,
            })
            .returning({ id: products.id });
          productId = newProduct[0].id;
        }

        // Get location ID
        const location = await tx
          .select({ id: locations.id })
          .from(locations)
          .where(eq(locations.code, (createInventoryDto as any).location))
          .limit(1);

        if (location.length === 0) {
          throw new Error(`Location ${(createInventoryDto as any).location} not found`);
        }

        // Create inventory record
        const newInventory = await tx
          .insert(inventory)
          .values({
            productId,
            locationId: location[0].id,
            quantityOnHand: (createInventoryDto as any).currentStock || 0,
            minQuantity: (createInventoryDto as any).minStock || 0,
            maxQuantity: (createInventoryDto as any).maxStock || 1000,
            unitCost: (createInventoryDto as any).unitCost || 0,
            status: 'available',
            tenantId,
          })
          .returning();

    const newInventoryItem = {
          id: newInventory[0].id,
          sku: createInventoryDto.sku,
          name: (createInventoryDto as any).name || createInventoryDto.sku,
          currentStock: (createInventoryDto as any).currentStock || 0,
          minStock: (createInventoryDto as any).minStock || 0,
          maxStock: (createInventoryDto as any).maxStock || 1000,
          unitCost: (createInventoryDto as any).unitCost || 0,
          totalValue: ((createInventoryDto as any).currentStock || 0) * ((createInventoryDto as any).unitCost || 0),
          location: (createInventoryDto as any).location,
      status: 'available',
          supplier: (createInventoryDto as any).supplier,
          createdAt: newInventory[0].createdAt,
          updatedAt: newInventory[0].updatedAt
    };

        // Emit event for billing integration
        this.eventEmitter.emit('inventory.created', {
          inventoryId: newInventoryItem.id,
          sku: createInventoryDto.sku,
          quantity: (createInventoryDto as any).currentStock,
          locationId: location[0].id,
          tenantId,
          contractId: null, // Will be set from database lookup
          operation: 'create'
        });

        // Emit real-time WebSocket event
        this.realtimeEventsService.broadcastToUser(tenantId, 'wms.inventory.created', {
          type: 'inventory_created',
          data: newInventoryItem,
          timestamp: new Date().toISOString()
        });

    this.logger.log(`Inventory item created and event emitted: ${newInventoryItem.id}`);
    return {
      success: true,
      message: 'Envanter öğesi başarıyla oluşturuldu',
      data: newInventoryItem
    };
      });
    } catch (error) {
      this.logger.error('Error creating inventory:', error);
      throw new Error('Failed to create inventory item');
    }
  }

  async updateInventory(id: string, updateInventoryDto: UpdateInventoryDto) {
    return {
      success: true,
      message: 'Envanter öğesi başarıyla güncellendi',
      data: {
        id,
        ...updateInventoryDto,
        updatedAt: new Date()
      }
    };
  }

  async deleteInventory(id: string) {
    return {
      success: true,
      message: 'Envanter öğesi başarıyla silindi',
      data: { id }
    };
  }

  async getReceipts(params: {
    page: number;
    limit: number;
    status?: string;
    supplier?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const { page, limit, status, supplier, dateFrom, dateTo } = params;
    
    try {
      // Import database schema
      const { receipts, receiptItems, products, locations } = await import('../../../database/schema/shared/wms.schema');
      const { eq, and, or, like, desc, gte, lte, sql } = await import('drizzle-orm');
      
      // Build where conditions
      const whereConditions = [];
    
    if (status) {
        whereConditions.push(eq(receipts.status, status));
    }
      
    if (supplier) {
        whereConditions.push(like(receipts.supplier, `%${supplier}%`));
    }
      
    if (dateFrom) {
        whereConditions.push(gte(receipts.createdAt, new Date(dateFrom)));
    }
      
    if (dateTo) {
        whereConditions.push(lte(receipts.createdAt, new Date(dateTo)));
      }

      // Get total count for pagination
      const totalCount = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(receipts)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

      // Get paginated receipts data
    const offset = (page - 1) * limit;
      const receiptsData = await this.db
        .select({
          id: receipts.id,
          receiptNumber: receipts.receiptNumber,
          supplier: receipts.supplier,
          status: receipts.status,
          totalValue: receipts.totalValue,
          receivedAt: receipts.receivedAt,
          createdAt: receipts.createdAt,
          updatedAt: receipts.updatedAt,
          items: sql<number>`count(${receiptItems.id})`
        })
        .from(receipts)
        .leftJoin(receiptItems, eq(receipts.id, receiptItems.receiptId))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .groupBy(receipts.id)
        .orderBy(desc(receipts.createdAt))
        .limit(limit)
        .offset(offset);

    return {
        items: receiptsData,
      pagination: {
        page,
        limit,
          total: totalCount[0]?.count || 0,
          pages: Math.ceil((totalCount[0]?.count || 0) / limit)
      }
    };
    } catch (error) {
      this.logger.error('Error fetching receipts:', error);
      throw new Error('Failed to fetch receipts data');
    }
  }

  async createReceipt(createReceiptDto: CreateReceiptDto, tenantId: string) {
    this.logger.log(`Creating receipt: ${createReceiptDto.receiptNumber}`);

    try {
      // Import database schema
      const { receipts, receiptItems, products, locations } = await import('../../../database/schema/shared/wms.schema');
      const { eq } = await import('drizzle-orm');

      // Start transaction
      return await this.db.transaction(async (tx) => {
        // Create receipt
        const newReceipt = await tx
          .insert(receipts)
          .values({
            receiptNumber: createReceiptDto.receiptNumber,
            supplier: createReceiptDto.supplier,
      status: 'pending',
            totalValue: createReceiptDto.totalValue,
            tenantId,
          })
          .returning();

        // Create receipt items
        for (const item of createReceiptDto.items) {
          // Find product by SKU
          const product = await tx
            .select({ id: products.id })
            .from(products)
            .where(eq(products.sku, item.sku))
            .limit(1);

          if (product.length === 0) {
            throw new Error(`Product with SKU ${item.sku} not found`);
          }

          // Find location
          const location = await tx
            .select({ id: locations.id })
            .from(locations)
            .where(eq(locations.code, item.location || 'DEFAULT'))
            .limit(1);

          // Create receipt item
          await tx
            .insert(receiptItems)
            .values({
              receiptId: newReceipt[0].id,
              productId: product[0].id,
              quantity: item.quantity,
              unitCost: item.unitCost,
              locationId: location[0]?.id,
            });
        }

    // Emit event for billing integration
    this.eventEmitter.emit('item.received', {
          receivingOrderId: newReceipt[0].id,
          receiptNumber: createReceiptDto.receiptNumber,
          items: createReceiptDto.items,
      tenantId,
      contractId: null, // Will be set from database lookup
      operation: 'receiving'
    });

        this.logger.log(`Receipt created and receiving event emitted: ${newReceipt[0].id}`);
    return {
      success: true,
      message: 'Mal kabul kaydı başarıyla oluşturuldu',
          data: {
            id: newReceipt[0].id,
            receiptNumber: newReceipt[0].receiptNumber,
            supplier: newReceipt[0].supplier,
            status: newReceipt[0].status,
            totalValue: newReceipt[0].totalValue,
            createdAt: newReceipt[0].createdAt,
            updatedAt: newReceipt[0].updatedAt
          }
        };
      });
    } catch (error) {
      this.logger.error('Error creating receipt:', error);
      throw new Error('Failed to create receipt');
    }
  }

  async updateReceipt(id: string, updateReceiptDto: UpdateReceiptDto) {
    return {
      success: true,
      message: 'Mal kabul kaydı başarıyla güncellendi',
      data: {
        id,
        ...updateReceiptDto,
        updatedAt: new Date()
      }
    };
  }

  async approveReceipt(id: string) {
    try {
      // Import database schema
      const { receipts, receiptItems, inventory, products } = await import('../../../database/schema/shared/wms.schema');
      const { eq } = await import('drizzle-orm');

      // Start transaction
      return await this.db.transaction(async (tx) => {
        // Update receipt status
        const updatedReceipt = await tx
          .update(receipts)
          .set({
            status: 'approved',
            receivedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(receipts.id, id))
          .returning();

        if (updatedReceipt.length === 0) {
          throw new Error('Receipt not found');
        }

        // Get receipt items
        const items = await tx
          .select()
          .from(receiptItems)
          .where(eq(receiptItems.receiptId, id));

        // Update inventory for each item
        for (const item of items) {
          // Check if inventory record exists
          const existingInventory = await tx
            .select()
            .from(inventory)
            .where(
              eq(inventory.productId, item.productId)
            )
            .limit(1);

          if (existingInventory.length > 0) {
            // Update existing inventory
            await tx
              .update(inventory)
              .set({
                quantityOnHand: existingInventory[0].quantityOnHand + item.quantity,
                updatedAt: new Date()
              })
              .where(eq(inventory.id, existingInventory[0].id));
          } else {
            // Create new inventory record
            await tx
              .insert(inventory)
              .values({
                productId: item.productId,
                locationId: item.locationId,
                quantityOnHand: item.quantity,
                minQuantity: 0,
                maxQuantity: 1000,
                unitCost: item.unitCost,
                status: 'available',
                tenantId,
              });
          }
        }

        // Emit event for inventory update
        this.eventEmitter.emit('inventory.updated', {
          receiptId: id,
          items: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            locationId: item.locationId
          })),
          tenantId,
          operation: 'receiving_approval'
        });

        this.logger.log(`Receipt approved and inventory updated: ${id}`);
    return {
      success: true,
      message: 'Mal kabul kaydı başarıyla onaylandı',
      data: {
        id,
        status: 'approved',
        approvedAt: new Date(),
        updatedAt: new Date()
      }
    };
      });
    } catch (error) {
      this.logger.error('Error approving receipt:', error);
      throw new Error('Failed to approve receipt');
    }
  }

  async getPicks(params: {
    page: number;
    limit: number;
    status?: string;
    assignedTo?: string;
    priority?: string;
  }) {
    const { page, limit, status, assignedTo, priority } = params;
    
    try {
      // Import database schema
      const { picks, pickItems, products, inventory } = await import('../../../database/schema/shared/wms.schema');
      const { eq, and, like, desc, sql } = await import('drizzle-orm');
      
      // Build where conditions
      const whereConditions = [];
    
    if (status) {
        whereConditions.push(eq(picks.status, status));
    }
      
    if (assignedTo) {
        whereConditions.push(eq(picks.assignedTo, assignedTo));
    }
      
    if (priority) {
        whereConditions.push(eq(picks.priority, priority));
      }

      // Get total count for pagination
      const totalCount = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(picks)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

      // Get paginated picks data
    const offset = (page - 1) * limit;
      const picksData = await this.db
        .select({
          id: picks.id,
          pickNumber: picks.pickNumber,
          orderId: picks.orderId,
          customer: picks.customer,
          status: picks.status,
          priority: picks.priority,
          assignedTo: picks.assignedTo,
          totalValue: picks.totalValue,
          createdAt: picks.createdAt,
          updatedAt: picks.updatedAt,
          items: sql<number>`count(${pickItems.id})`
        })
        .from(picks)
        .leftJoin(pickItems, eq(picks.id, pickItems.pickId))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .groupBy(picks.id)
        .orderBy(desc(picks.createdAt))
        .limit(limit)
        .offset(offset);

    return {
        items: picksData,
      pagination: {
        page,
        limit,
          total: totalCount[0]?.count || 0,
          pages: Math.ceil((totalCount[0]?.count || 0) / limit)
      }
    };
    } catch (error) {
      this.logger.error('Error fetching picks:', error);
      throw new Error('Failed to fetch picks data');
    }
  }

  async createPick(createPickDto: CreatePickDto, tenantId: string) {
    try {
      // Import database schema
      const { picks, pickItems, products, inventory } = await import('../../../database/schema/shared/wms.schema');
      const { eq } = await import('drizzle-orm');

      // Start transaction
      return await this.db.transaction(async (tx) => {
        // Calculate total value
        let totalValue = 0;
        for (const item of createPickDto.items) {
          const product = await tx
            .select({ unitPrice: products.unitPrice })
            .from(products)
            .where(eq(products.sku, item.sku))
            .limit(1);
          
          if (product.length > 0) {
            totalValue += (product[0].unitPrice || 0) * item.quantity;
          }
        }

        // Create pick
        const newPick = await tx
          .insert(picks)
          .values({
            pickNumber: createPickDto.pickNumber,
            orderId: createPickDto.orderId,
            customer: createPickDto.customer,
      status: 'pending',
            priority: createPickDto.priority,
            assignedTo: createPickDto.assignedTo,
            totalValue,
            tenantId,
          })
          .returning();

        // Create pick items
        for (const item of createPickDto.items) {
          // Find product by SKU
          const product = await tx
            .select({ id: products.id })
            .from(products)
            .where(eq(products.sku, item.sku))
            .limit(1);

          if (product.length === 0) {
            throw new Error(`Product with SKU ${item.sku} not found`);
          }

          // Check inventory availability
          const inventoryRecord = await tx
            .select()
            .from(inventory)
            .where(
              eq(inventory.productId, product[0].id)
            )
            .limit(1);

          if (inventoryRecord.length === 0 || inventoryRecord[0].quantityOnHand < item.quantity) {
            throw new Error(`Insufficient inventory for SKU ${item.sku}`);
          }

          // Create pick item
          await tx
            .insert(pickItems)
            .values({
              pickId: newPick[0].id,
              productId: product[0].id,
              quantity: item.quantity,
              location: item.location,
            });
        }

        this.logger.log(`Pick created: ${newPick[0].id}`);
    return {
      success: true,
      message: 'Toplama işlemi başarıyla oluşturuldu',
          data: {
            id: newPick[0].id,
            pickNumber: newPick[0].pickNumber,
            orderId: newPick[0].orderId,
            customer: newPick[0].customer,
            status: newPick[0].status,
            priority: newPick[0].priority,
            assignedTo: newPick[0].assignedTo,
            totalValue: newPick[0].totalValue,
            createdAt: newPick[0].createdAt,
            updatedAt: newPick[0].updatedAt
          }
        };
      });
    } catch (error) {
      this.logger.error('Error creating pick:', error);
      throw new Error('Failed to create pick');
    }
  }

  async updatePick(id: string, updatePickDto: UpdatePickDto) {
    return {
      success: true,
      message: 'Toplama işlemi başarıyla güncellendi',
      data: {
        id,
        ...updatePickDto,
        updatedAt: new Date()
      }
    };
  }

  async assignPick(id: string, assignedTo: string) {
    try {
      // Import database schema
      const { picks } = await import('../../../database/schema/shared/wms.schema');
      const { eq } = await import('drizzle-orm');

      const updatedPick = await this.db
        .update(picks)
        .set({
          assignedTo,
          status: 'assigned',
          updatedAt: new Date()
        })
        .where(eq(picks.id, id))
        .returning();

      if (updatedPick.length === 0) {
        throw new Error('Pick not found');
      }

      this.logger.log(`Pick assigned: ${id} to ${assignedTo}`);
    return {
      success: true,
      message: 'Toplama işlemi başarıyla atandı',
      data: {
        id,
        assignedTo,
        status: 'assigned',
        updatedAt: new Date()
      }
    };
    } catch (error) {
      this.logger.error('Error assigning pick:', error);
      throw new Error('Failed to assign pick');
    }
  }

  async startPick(id: string, tenantId: string) {
    this.logger.log(`Starting pick operation: ${id}`);

    try {
      // Import database schema
      const { picks } = await import('../../../database/schema/shared/wms.schema');
      const { eq } = await import('drizzle-orm');

      const updatedPick = await this.db
        .update(picks)
        .set({
      status: 'in_progress',
      startedAt: new Date(),
      updatedAt: new Date()
        })
        .where(eq(picks.id, id))
        .returning();

      if (updatedPick.length === 0) {
        throw new Error('Pick not found');
      }

    // Emit event for billing integration
    this.eventEmitter.emit('picking.started', {
      pickId: id,
      tenantId,
      contractId: null, // Will be set from database lookup
      operation: 'picking_start'
    });

    this.logger.log(`Pick started and event emitted: ${id}`);
    return {
      success: true,
      message: 'Toplama işlemi başarıyla başlatıldı',
        data: {
          id,
          status: 'in_progress',
          startedAt: new Date(),
          updatedAt: new Date()
        }
      };
    } catch (error) {
      this.logger.error('Error starting pick:', error);
      throw new Error('Failed to start pick');
    }
  }

  async completePick(id: string, tenantId: string) {
    this.logger.log(`Completing pick operation: ${id}`);

    try {
      // Import database schema
      const { picks, pickItems, inventory } = await import('../../../database/schema/shared/wms.schema');
      const { eq } = await import('drizzle-orm');

      // Start transaction
      return await this.db.transaction(async (tx) => {
        // Update pick status
        const updatedPick = await tx
          .update(picks)
          .set({
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date()
          })
          .where(eq(picks.id, id))
          .returning();

        if (updatedPick.length === 0) {
          throw new Error('Pick not found');
        }

        // Get pick items
        const items = await tx
          .select()
          .from(pickItems)
          .where(eq(pickItems.pickId, id));

        // Update inventory for each item
        for (const item of items) {
          const inventoryRecord = await tx
            .select()
            .from(inventory)
            .where(eq(inventory.productId, item.productId))
            .limit(1);

          if (inventoryRecord.length > 0) {
            await tx
              .update(inventory)
              .set({
                quantityOnHand: inventoryRecord[0].quantityOnHand - item.quantity,
                updatedAt: new Date()
              })
              .where(eq(inventory.id, inventoryRecord[0].id));
          }
        }

    // Emit event for billing integration
    this.eventEmitter.emit('picking.completed', {
      pickId: id,
          items: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity
          })),
      tenantId,
      contractId: null, // Will be set from database lookup
      operation: 'picking_complete'
    });

    this.logger.log(`Pick completed and event emitted: ${id}`);
    return {
      success: true,
      message: 'Toplama işlemi başarıyla tamamlandı',
          data: {
            id,
            status: 'completed',
            completedAt: new Date(),
            updatedAt: new Date()
          }
        };
      });
    } catch (error) {
      this.logger.error('Error completing pick:', error);
      throw new Error('Failed to complete pick');
    }
  }

  async getShipments(params: {
    page: number;
    limit: number;
    status?: string;
    customer?: string;
    driver?: string;
  }) {
    const { page, limit, status, customer, driver } = params;
    
    try {
      // Import database schema
      const { shipments, shipmentItems, products } = await import('../../../database/schema/shared/wms.schema');
      const { eq, and, like, desc, sql } = await import('drizzle-orm');
      
      // Build where conditions
      const whereConditions = [];
    
    if (status) {
        whereConditions.push(eq(shipments.status, status));
    }
      
    if (customer) {
        whereConditions.push(like(shipments.customer, `%${customer}%`));
    }
      
    if (driver) {
        whereConditions.push(eq(shipments.driverId, driver));
      }

      // Get total count for pagination
      const totalCount = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(shipments)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

      // Get paginated shipments data
    const offset = (page - 1) * limit;
      const shipmentsData = await this.db
        .select({
          id: shipments.id,
          shipmentNumber: shipments.shipmentNumber,
          orderId: shipments.orderId,
          customer: shipments.customer,
          status: shipments.status,
          priority: shipments.priority,
          driverId: shipments.driverId,
          vehicleId: shipments.vehicleId,
          totalValue: shipments.totalValue,
          destination: shipments.destination,
          expectedDelivery: shipments.expectedDelivery,
          createdAt: shipments.createdAt,
          updatedAt: shipments.updatedAt,
          items: sql<number>`count(${shipmentItems.id})`
        })
        .from(shipments)
        .leftJoin(shipmentItems, eq(shipments.id, shipmentItems.shipmentId))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .groupBy(shipments.id)
        .orderBy(desc(shipments.createdAt))
        .limit(limit)
        .offset(offset);

    return {
        items: shipmentsData,
      pagination: {
        page,
        limit,
          total: totalCount[0]?.count || 0,
          pages: Math.ceil((totalCount[0]?.count || 0) / limit)
      }
    };
    } catch (error) {
      this.logger.error('Error fetching shipments:', error);
      throw new Error('Failed to fetch shipments data');
    }
  }

  async createShipment(createShipmentDto: CreateShipmentDto, tenantId: string) {
    this.logger.log(`Creating shipment: ${createShipmentDto.shipmentNumber}`);

    try {
      // Import database schema
      const { shipments, shipmentItems, products } = await import('../../../database/schema/shared/wms.schema');
      const { eq } = await import('drizzle-orm');

      // Start transaction
      return await this.db.transaction(async (tx) => {
        // Calculate total value
        let totalValue = 0;
        for (const item of createShipmentDto.items) {
          const product = await tx
            .select({ unitPrice: products.unitPrice })
            .from(products)
            .where(eq(products.sku, item.sku))
            .limit(1);
          
          if (product.length > 0) {
            totalValue += (product[0].unitPrice || 0) * item.quantity;
          }
        }

        // Create shipment
        const newShipment = await tx
          .insert(shipments)
          .values({
            shipmentNumber: createShipmentDto.shipmentNumber,
            orderId: createShipmentDto.orderId,
            customer: createShipmentDto.customer,
      status: 'pending',
            priority: createShipmentDto.priority,
            driverId: createShipmentDto.driver,
            vehicleId: createShipmentDto.vehicle,
            totalValue,
            destination: createShipmentDto.destination,
            carrier: createShipmentDto.carrier,
            tenantId,
          })
          .returning();

        // Create shipment items
        for (const item of createShipmentDto.items) {
          // Find product by SKU
          const product = await tx
            .select({ id: products.id })
            .from(products)
            .where(eq(products.sku, item.sku))
            .limit(1);

          if (product.length === 0) {
            throw new Error(`Product with SKU ${item.sku} not found`);
          }

          // Create shipment item
          await tx
            .insert(shipmentItems)
            .values({
              shipmentId: newShipment[0].id,
              productId: product[0].id,
              quantity: item.quantity,
              weight: item.weight,
              dimensions: item.dimensions,
            });
        }

    // Emit event for billing integration
    this.eventEmitter.emit('shipment.created', {
          shipmentId: newShipment[0].id,
          orderId: createShipmentDto.orderId,
          items: createShipmentDto.items,
      tenantId,
      contractId: null, // Will be set from database lookup
      operation: 'shipping_create'
    });

        this.logger.log(`Shipment created and event emitted: ${newShipment[0].id}`);
    return {
      success: true,
      message: 'Sevkiyat başarıyla oluşturuldu',
          data: {
            id: newShipment[0].id,
            shipmentNumber: newShipment[0].shipmentNumber,
            orderId: newShipment[0].orderId,
            customer: newShipment[0].customer,
            status: newShipment[0].status,
            priority: newShipment[0].priority,
            driverId: newShipment[0].driverId,
            vehicleId: newShipment[0].vehicleId,
            totalValue: newShipment[0].totalValue,
            destination: newShipment[0].destination,
            createdAt: newShipment[0].createdAt,
            updatedAt: newShipment[0].updatedAt
          }
        };
      });
    } catch (error) {
      this.logger.error('Error creating shipment:', error);
      throw new Error('Failed to create shipment');
    }
  }

  async updateShipment(id: string, updateShipmentDto: UpdateShipmentDto) {
    return {
      success: true,
      message: 'Sevkiyat başarıyla güncellendi',
      data: {
        id,
        ...updateShipmentDto,
        updatedAt: new Date()
      }
    };
  }

  async dispatchShipment(id: string, tenantId: string) {
    this.logger.log(`Dispatching shipment: ${id}`);

    try {
      // Import database schema
      const { shipments } = await import('../../../database/schema/shared/wms.schema');
      const { eq } = await import('drizzle-orm');

      const updatedShipment = await this.db
        .update(shipments)
        .set({
          status: 'dispatched',
          dispatchedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(shipments.id, id))
        .returning();

      if (updatedShipment.length === 0) {
        throw new Error('Shipment not found');
      }

      // Emit event for billing integration
      this.eventEmitter.emit('shipment.dispatched', {
        shipmentId: id,
          tenantId,
        contractId: 'default', // TODO: Get from context
        operation: 'shipping_dispatch'
      });

      this.logger.log(`Shipment dispatched and event emitted: ${id}`);
      return {
        success: true,
        message: 'Sevkiyat başarıyla sevk edildi',
        data: {
          id,
          status: 'dispatched',
          dispatchedAt: new Date(),
          updatedAt: new Date()
        }
      };
    } catch (error) {
      this.logger.error('Error dispatching shipment:', error);
      throw new Error('Failed to dispatch shipment');
    }
  }

  async getOperations(params: {
    type?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const { type, status, dateFrom, dateTo } = params;
    
    try {
      // Import database schema
      const { operations } = await import('../../../database/schema/shared/wms.schema');
      const { eq, and, gte, lte, desc } = await import('drizzle-orm');
      
      // Build where conditions
      const whereConditions = [];
      
      if (type) {
        whereConditions.push(eq(operations.type, type));
      }
      
      if (status) {
        whereConditions.push(eq(operations.status, status));
      }
      
      if (dateFrom) {
        whereConditions.push(gte(operations.createdAt, new Date(dateFrom)));
      }
      
      if (dateTo) {
        whereConditions.push(lte(operations.createdAt, new Date(dateTo)));
      }

      // Get operations data
      const operationsData = await this.db
        .select()
        .from(operations)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(operations.createdAt));

      return operationsData;
    } catch (error) {
      this.logger.error('Error fetching operations:', error);
      throw new Error('Failed to fetch operations data');
    }
  }

  async getOperationsStats() {
    try {
      // Import database schema
      const { operations } = await import('../../../database/schema/shared/wms.schema');
      const { eq, and, gte, lte, sql, count, avg } = await import('drizzle-orm');

      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Get total operations
      const totalOps = await this.db
        .select({ count: count() })
        .from(operations);

      // Get completed operations
      const completedOps = await this.db
        .select({ count: count() })
        .from(operations)
        .where(eq(operations.status, 'completed'));

      // Get pending operations
      const pendingOps = await this.db
        .select({ count: count() })
        .from(operations)
        .where(eq(operations.status, 'pending'));

      // Get in progress operations
      const inProgressOps = await this.db
        .select({ count: count() })
        .from(operations)
        .where(eq(operations.status, 'in_progress'));

      // Get today's operations
      const todayOps = await this.db
        .select({ count: count() })
        .from(operations)
        .where(gte(operations.createdAt, startOfDay));

      // Get this week's operations
      const weeklyOps = await this.db
        .select({ count: count() })
        .from(operations)
        .where(gte(operations.createdAt, startOfWeek));

      // Get this month's operations
      const monthlyOps = await this.db
        .select({ count: count() })
        .from(operations)
        .where(gte(operations.createdAt, startOfMonth));

      // Get average duration
      const avgDuration = await this.db
        .select({ avg: avg(operations.duration) })
        .from(operations)
        .where(eq(operations.status, 'completed'));

      const totalOperations = totalOps[0]?.count || 0;
      const completedOperations = completedOps[0]?.count || 0;
      const efficiency = totalOperations > 0 ? (completedOperations / totalOperations) * 100 : 0;

      return {
        totalOperations,
        completedOperations,
        pendingOperations: pendingOps[0]?.count || 0,
        inProgressOperations: inProgressOps[0]?.count || 0,
        averageDuration: avgDuration[0]?.avg || 0,
        efficiency: Math.round(efficiency * 100) / 100,
        todayOperations: todayOps[0]?.count || 0,
        weeklyOperations: weeklyOps[0]?.count || 0,
        monthlyOperations: monthlyOps[0]?.count || 0
      };
    } catch (error) {
      this.logger.error('Error fetching operations stats:', error);
      throw new Error('Failed to fetch operations statistics');
    }
  }

  async getZones() {
    try {
      // Import database schema
      const { zones, inventory } = await import('../../../database/schema/shared/wms.schema');
      const { eq, sql, sum } = await import('drizzle-orm');

      // Get all zones with capacity calculations
      const zonesData = await this.db
        .select({
          id: zones.id,
          name: zones.name,
          code: zones.code,
          description: zones.description,
          capacity: zones.capacity,
          temperature: zones.temperature,
          humidity: zones.humidity,
          status: zones.status,
          createdAt: zones.createdAt,
          updatedAt: zones.updatedAt,
          usedCapacity: sql<number>`coalesce(${sum(inventory.quantityOnHand)}, 0)`
        })
        .from(zones)
        .leftJoin(inventory, eq(zones.id, inventory.zoneId))
        .groupBy(zones.id)
        .orderBy(zones.code);

      // Calculate available capacity for each zone
      const zonesWithCapacity = zonesData.map(zone => ({
        ...zone,
        availableCapacity: zone.capacity - (zone.usedCapacity || 0),
        utilizationRate: zone.capacity > 0 ? Math.round(((zone.usedCapacity || 0) / zone.capacity) * 100) : 0
      }));

      return zonesWithCapacity;
    } catch (error) {
      this.logger.error('Error fetching zones:', error);
      throw new Error('Failed to fetch zones data');
    }
  }

  async getZoneCapacity(zoneId: string) {
    try {
      // Import database schema
      const { zones, inventory, products } = await import('../../../database/schema/shared/wms.schema');
      const { eq, sql, sum, count } = await import('drizzle-orm');

      // Get zone details
      const zone = await this.db
        .select()
        .from(zones)
        .where(eq(zones.id, zoneId))
        .limit(1);

      if (zone.length === 0) {
        throw new Error('Zone not found');
      }

      // Get capacity statistics
      const capacityStats = await this.db
        .select({
          usedCapacity: sql<number>`coalesce(${sum(inventory.quantityOnHand)}, 0)`,
          items: sql<number>`coalesce(${count(inventory.id)}, 0)`,
          totalValue: sql<number>`coalesce(${sum(sql`${inventory.quantityOnHand} * ${inventory.unitCost}`)}, 0)`
        })
        .from(inventory)
        .innerJoin(products, eq(inventory.productId, products.id))
        .where(eq(inventory.zoneId, zoneId));

      const stats = capacityStats[0] || { usedCapacity: 0, items: 0, totalValue: 0 };
      const usedCapacity = stats.usedCapacity || 0;
      const totalCapacity = zone[0].capacity;
      const availableCapacity = totalCapacity - usedCapacity;
      const utilizationRate = totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0;

      return {
        zone: {
          ...zone[0],
          usedCapacity,
          availableCapacity,
          utilizationRate,
          lastUpdated: new Date()
        },
        capacity: {
          totalCapacity,
          usedCapacity,
          availableCapacity,
          utilizationRate,
          items: stats.items || 0,
          value: stats.totalValue || 0
        }
      };
    } catch (error) {
      this.logger.error('Error fetching zone capacity:', error);
      throw new Error('Failed to fetch zone capacity');
    }
  }
}
