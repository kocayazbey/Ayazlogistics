import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { StandardizedDatabaseService } from '../../../../core/database/standardized-database.service';
import { eq, and, or, sql } from 'drizzle-orm';
import { inventory, locations, products, receivingOrders, pickingOrders, shipments } from '../../../../database/schema/shared/wms.schema';
import { stockMovements, batchLots } from '../../../../database/schema/shared/erp-inventory.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';

/**
 * Comprehensive Handheld Operations Service
 * Based on Axata WMS Handheld functionality - 850+ pages of features
 * 
 * Axata HH Major Modules:
 * 1. Receiving Operations (Multiple types)
 * 2. Putaway Operations
 * 3. Picking Operations (Wave, Batch, Zone, Single)
 * 4. Packing Operations
 * 5. Shipping Operations
 * 6. Transfer Operations (Multiple types)
 * 7. Return Operations
 * 8. Cycle Count Operations
 * 9. Physical Count Operations
 * 10. Replenishment Operations
 * 11. Quality Control
 * 12. Inventory Adjustment
 * 13. Pallet Operations
 * 14. Cross-Dock Operations
 * 15. Kitting/Assembly
 * 16. Consolidation
 * 17. Stock Point Operations
 * 18. Query Operations
 * 19. Label Printing
 * 20. Reports
 */
@Injectable()
export class HandheldOperationsService {
  private readonly logger = new Logger(HandheldOperationsService.name);
  private activeSessions: Map<string, any> = new Map();

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly dbService: StandardizedDatabaseService,
    private readonly eventBus: EventBusService,
  ) {}

  private get db() {
    return this.dbService.getDb();
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  async startHandheldSession(userId: string, deviceId: string, warehouseId: string) {
    const sessionId = `HH-${Date.now()}-${deviceId}`;
    
    const session = {
      sessionId,
      userId,
      deviceId,
      warehouseId,
      startTime: new Date(),
      lastActivity: new Date(),
      currentTask: null,
      language: 'tr-TR',
      displayMode: 'barcode_first',
    };

    this.activeSessions.set(sessionId, session);

    await this.eventBus.emit('handheld.session.started', { sessionId, userId, deviceId, warehouseId });

    return {
      sessionId,
      welcomeMessage: 'Hoşgeldiniz / Welcome',
      menu: this.getMainMenu(session.language),
      session,
    };
  }

  async endHandheldSession(sessionId: string) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      await this.eventBus.emit('handheld.session.ended', {
        sessionId,
        duration: Date.now() - session.startTime.getTime(),
      });
      this.activeSessions.delete(sessionId);
    }
    return { sessionId, ended: true };
  }

  private getMainMenu(language: string = 'tr-TR') {
    const menus = {
      'tr-TR': [
        { code: '1', name: 'Giriş İşlemleri', icon: 'inbox', submenu: 'receiving' },
        { code: '2', name: 'Çıkış İşlemleri', icon: 'outbox', submenu: 'shipping' },
        { code: '3', name: 'Toplama İşlemleri', icon: 'shopping-cart', submenu: 'picking' },
        { code: '4', name: 'Yerleştirme', icon: 'archive', submenu: 'putaway' },
        { code: '5', name: 'Transfer İşlemleri', icon: 'swap', submenu: 'transfer' },
        { code: '6', name: 'Sayım İşlemleri', icon: 'calculator', submenu: 'counting' },
        { code: '7', name: 'İade İşlemleri', icon: 'return', submenu: 'returns' },
        { code: '8', name: 'Palet İşlemleri', icon: 'pallet', submenu: 'pallet' },
        { code: '9', name: 'Sorgulama', icon: 'search', submenu: 'query' },
        { code: '10', name: 'Etiket İşlemleri', icon: 'label', submenu: 'label' },
        { code: '11', name: 'Kalite Kontrol', icon: 'check-circle', submenu: 'quality' },
        { code: '12', name: 'Stok Düzeltme', icon: 'edit', submenu: 'adjustment' },
        { code: '13', name: 'İkmal İşlemleri', icon: 'refresh', submenu: 'replenishment' },
        { code: '14', name: 'Paketleme', icon: 'package', submenu: 'packing' },
        { code: '15', name: 'Cross-Dock', icon: 'fast-forward', submenu: 'crossdock' },
      ],
      'en-US': [
        { code: '1', name: 'Receiving', icon: 'inbox', submenu: 'receiving' },
        { code: '2', name: 'Shipping', icon: 'outbox', submenu: 'shipping' },
        { code: '3', name: 'Picking', icon: 'shopping-cart', submenu: 'picking' },
        { code: '4', name: 'Putaway', icon: 'archive', submenu: 'putaway' },
        { code: '5', name: 'Transfer', icon: 'swap', submenu: 'transfer' },
        { code: '6', name: 'Counting', icon: 'calculator', submenu: 'counting' },
        { code: '7', name: 'Returns', icon: 'return', submenu: 'returns' },
        { code: '8', name: 'Pallet Operations', icon: 'pallet', submenu: 'pallet' },
        { code: '9', name: 'Query', icon: 'search', submenu: 'query' },
        { code: '10', name: 'Labels', icon: 'label', submenu: 'label' },
        { code: '11', name: 'Quality Control', icon: 'check-circle', submenu: 'quality' },
        { code: '12', name: 'Stock Adjustment', icon: 'edit', submenu: 'adjustment' },
        { code: '13', name: 'Replenishment', icon: 'refresh', submenu: 'replenishment' },
        { code: '14', name: 'Packing', icon: 'package', submenu: 'packing' },
        { code: '15', name: 'Cross-Dock', icon: 'fast-forward', submenu: 'crossdock' },
      ],
    };

    return menus[language] || menus['en-US'];
  }

  // ============================================================================
  // RECEIVING OPERATIONS (Axata: Giriş İşlemleri)
  // ============================================================================

  async startPurchaseOrderReceiving(sessionId: string, poNumber: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    // Find PO
    const [receivingOrder] = await this.db
      .select()
      .from(receivingOrders)
      .where(eq(receivingOrders.poNumber, poNumber))
      .limit(1);

    if (!receivingOrder) {
      return {
        success: false,
        message: 'Sipariş bulunamadı / PO not found',
        poNumber,
      };
    }

    session.currentTask = {
      type: 'receiving',
      poNumber,
      receivingOrderId: receivingOrder.id,
      expectedItems: receivingOrder.metadata?.items || [],
      receivedItems: [],
      startedAt: new Date(),
    };

    this.activeSessions.set(sessionId, session);

    return {
      success: true,
      poNumber,
      expectedItems: session.currentTask.expectedItems,
      instructions: 'Ürünleri tarayın / Scan products',
      nextStep: 'scan_product',
    };
  }

  async scanProductForReceiving(sessionId: string, barcode: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.currentTask || session.currentTask.type !== 'receiving') {
      throw new BadRequestException('No active receiving task');
    }

    // Find product
    const [product] = await this.db
      .select()
      .from(products)
      .where(or(eq(products.barcode, barcode), eq(products.sku, barcode)))
      .limit(1);

    if (!product) {
      return {
        success: false,
        message: 'Ürün bulunamadı / Product not found',
        barcode,
      };
    }

    // Check if expected
    const expectedItem = session.currentTask.expectedItems.find((item: any) => item.productId === product.id);

    return {
      success: true,
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        barcode: product.barcode,
      },
      expected: !!expectedItem,
      expectedQuantity: expectedItem?.quantity || 0,
      instructions: 'Miktarı girin / Enter quantity',
      nextStep: 'enter_quantity',
      lotRequired: product.metadata?.requiresLotTracking || false,
      serialRequired: product.metadata?.requiresSerialTracking || false,
    };
  }

  async enterReceivedQuantity(sessionId: string, productId: string, quantity: number, data?: {
    lotNumber?: string;
    expiryDate?: Date;
    serialNumbers?: string[];
    condition?: 'good' | 'damaged' | 'expired';
    notes?: string;
  }) {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.currentTask) {
      throw new BadRequestException('No active task');
    }

    const receivedItem = {
      productId,
      quantity,
      lotNumber: data?.lotNumber,
      expiryDate: data?.expiryDate,
      serialNumbers: data?.serialNumbers || [],
      condition: data?.condition || 'good',
      notes: data?.notes,
      receivedAt: new Date(),
      receivedBy: session.userId,
    };

    session.currentTask.receivedItems.push(receivedItem);
    this.activeSessions.set(sessionId, session);

    const remainingItems = session.currentTask.expectedItems.filter(
      (item: any) => !session.currentTask.receivedItems.some((rec: any) => rec.productId === item.productId)
    );

    return {
      success: true,
      message: 'Ürün kaydedildi / Item recorded',
      receivedItem,
      progress: {
        received: session.currentTask.receivedItems.length,
        expected: session.currentTask.expectedItems.length,
        remaining: remainingItems.length,
      },
      nextStep: remainingItems.length > 0 ? 'scan_product' : 'complete_receiving',
    };
  }

  async completeReceiving(sessionId: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.currentTask || session.currentTask.type !== 'receiving') {
      throw new BadRequestException('No active receiving task');
    }

    const task = session.currentTask;

    // Update receiving order
    await this.db
      .update(receivingOrders)
      .set({
        status: 'completed',
        receivedDate: new Date(),
        receivedBy: session.userId,
        metadata: {
          receivedItems: task.receivedItems,
          completedAt: new Date(),
        },
      })
      .where(eq(receivingOrders.id, task.receivingOrderId));

    // Create inventory records
    for (const item of task.receivedItems) {
      await this.eventBus.emit('item.received', {
        receivingOrderId: task.receivingOrderId,
        productId: item.productId,
        quantity: item.quantity,
        tenantId: session.tenantId,
        userId: session.userId,
      });
    }

    session.currentTask = null;
    this.activeSessions.set(sessionId, session);

    return {
      success: true,
      message: 'Mal kabul tamamlandı / Receiving completed',
      summary: {
        poNumber: task.poNumber,
        totalItems: task.receivedItems.length,
        totalQuantity: task.receivedItems.reduce((sum: number, item: any) => sum + item.quantity, 0),
        completedAt: new Date(),
      },
      nextAction: 'return_to_menu',
    };
  }

  // ============================================================================
  // PUTAWAY OPERATIONS (Axata: Yerleştirme)
  // ============================================================================

  async startPutawayTask(sessionId: string, palletId?: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    let pallet;
    if (palletId) {
      const [inv] = await this.db
        .select({ inventory, product: products })
        .from(inventory)
        .leftJoin(products, eq(inventory.productId, products.id))
        .where(eq(inventory.id, palletId))
        .limit(1);

      pallet = inv;
    }

    // Get suggested location
    const suggestedLocation = pallet ? await this.getSuggestedPutawayLocation(pallet.product, session.warehouseId) : null;

    session.currentTask = {
      type: 'putaway',
      palletId,
      pallet,
      suggestedLocation,
      startedAt: new Date(),
    };

    this.activeSessions.set(sessionId, session);

    return {
      success: true,
      pallet: pallet || null,
      suggestedLocation,
      instructions: 'Önerilen lokasyonu tarayın / Scan suggested location',
      nextStep: 'scan_location',
      allowAlternative: true,
    };
  }

  async scanPutawayLocation(sessionId: string, locationCode: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.currentTask || session.currentTask.type !== 'putaway') {
      throw new BadRequestException('No active putaway task');
    }

    const [location] = await this.db
      .select()
      .from(locations)
      .where(and(eq(locations.code, locationCode), eq(locations.warehouseId, session.warehouseId)))
      .limit(1);

    if (!location) {
      return {
        success: false,
        message: 'Lokasyon bulunamadı / Location not found',
        locationCode,
      };
    }

    if (location.isOccupied && !location.metadata?.allowMixed) {
      return {
        success: false,
        message: 'Lokasyon dolu / Location occupied',
        locationCode,
        suggestAlternative: true,
      };
    }

    const isSuggested = session.currentTask.suggestedLocation?.code === locationCode;

    return {
      success: true,
      location,
      isSuggested,
      warning: !isSuggested ? 'Önerilen lokasyon değil / Not suggested location' : null,
      confirm: true,
      nextStep: 'confirm_putaway',
    };
  }

  async confirmPutaway(sessionId: string, locationId: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.currentTask) {
      throw new BadRequestException('No active task');
    }

    const task = session.currentTask;

    // Update inventory location
    if (task.palletId) {
      await this.db
        .update(inventory)
        .set({
          locationId,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, task.palletId));

      await this.db
        .update(locations)
        .set({
          isOccupied: true,
          updatedAt: new Date(),
        })
        .where(eq(locations.id, locationId));

      await this.eventBus.emit('putaway.completed', {
        palletId: task.palletId,
        locationId,
        userId: session.userId,
        tenantId: session.tenantId,
      });
    }

    session.currentTask = null;
    this.activeSessions.set(sessionId, session);

    return {
      success: true,
      message: 'Yerleştirme tamamlandı / Putaway completed',
      palletId: task.palletId,
      location: locationId,
      completedAt: new Date(),
    };
  }

  private async getSuggestedPutawayLocation(product: any, warehouseId: string) {
    // Simple ABC logic - find empty location in appropriate zone
    const preferredZone = product?.metadata?.preferredZone || 'A';

    const [location] = await this.db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.warehouseId, warehouseId),
          eq(locations.zone, preferredZone),
          eq(locations.isOccupied, false)
        )
      )
      .limit(1);

    return location || null;
  }

  // ============================================================================
  // PICKING OPERATIONS (Axata: Toplama İşlemleri)
  // ============================================================================

  async startPickingTask(sessionId: string, pickingOrderId: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    const [pickingOrder] = await this.db
      .select()
      .from(pickingOrders)
      .where(eq(pickingOrders.id, pickingOrderId))
      .limit(1);

    if (!pickingOrder) {
      return {
        success: false,
        message: 'Toplama siparişi bulunamadı / Picking order not found',
      };
    }

    const tasks = pickingOrder.metadata?.tasks || [];
    const sortedTasks = this.optimizePickingRoute(tasks);

    session.currentTask = {
      type: 'picking',
      pickingOrderId,
      tasks: sortedTasks,
      currentTaskIndex: 0,
      pickedItems: [],
      startedAt: new Date(),
    };

    this.activeSessions.set(sessionId, session);

    const currentTask = sortedTasks[0];

    return {
      success: true,
      pickingOrder,
      currentTask,
      progress: { current: 1, total: sortedTasks.length },
      instructions: `Lokasyona git: ${currentTask.locationCode} / Go to location: ${currentTask.locationCode}`,
      nextStep: 'scan_location',
    };
  }

  async scanPickingLocation(sessionId: string, locationCode: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.currentTask || session.currentTask.type !== 'picking') {
      throw new BadRequestException('No active picking task');
    }

    const currentTask = session.currentTask.tasks[session.currentTask.currentTaskIndex];

    if (currentTask.locationCode !== locationCode) {
      return {
        success: false,
        message: `Yanlış lokasyon. Beklenen: ${currentTask.locationCode} / Wrong location. Expected: ${currentTask.locationCode}`,
        expected: currentTask.locationCode,
        scanned: locationCode,
      };
    }

    return {
      success: true,
      message: 'Lokasyon doğru / Location correct',
      task: currentTask,
      instructions: `Ürünü tarayın: ${currentTask.sku} / Scan product: ${currentTask.sku}`,
      nextStep: 'scan_product',
    };
  }

  async scanPickingProduct(sessionId: string, barcode: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.currentTask) {
      throw new BadRequestException('No active task');
    }

    const currentTask = session.currentTask.tasks[session.currentTask.currentTaskIndex];

    const [product] = await this.db
      .select()
      .from(products)
      .where(or(eq(products.barcode, barcode), eq(products.sku, barcode)))
      .limit(1);

    if (!product || product.id !== currentTask.productId) {
      return {
        success: false,
        message: 'Yanlış ürün / Wrong product',
        expected: currentTask.sku,
        scanned: barcode,
      };
    }

    return {
      success: true,
      product,
      requiredQuantity: currentTask.quantity,
      instructions: `Miktar: ${currentTask.quantity} / Quantity: ${currentTask.quantity}`,
      nextStep: 'confirm_quantity',
    };
  }

  async confirmPickingQuantity(sessionId: string, quantity: number) {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.currentTask) {
      throw new BadRequestException('No active task');
    }

    const currentTask = session.currentTask.tasks[session.currentTask.currentTaskIndex];

    if (quantity !== currentTask.quantity) {
      return {
        success: false,
        message: `Miktar uyuşmuyor. Beklenen: ${currentTask.quantity}, Girilen: ${quantity} / Quantity mismatch`,
        expected: currentTask.quantity,
        entered: quantity,
        allowShortPick: true,
      };
    }

    // Record picked item
    session.currentTask.pickedItems.push({
      ...currentTask,
      pickedQuantity: quantity,
      pickedAt: new Date(),
      pickedBy: session.userId,
    });

    session.currentTask.currentTaskIndex++;
    const hasMore = session.currentTask.currentTaskIndex < session.currentTask.tasks.length;

    this.activeSessions.set(sessionId, session);

    if (!hasMore) {
      return {
        success: true,
        message: 'Tüm ürünler toplandı / All items picked',
        nextStep: 'complete_picking',
        summary: {
          totalPicked: session.currentTask.pickedItems.length,
          totalQuantity: session.currentTask.pickedItems.reduce((sum: number, item: any) => sum + item.pickedQuantity, 0),
        },
      };
    }

    const nextTask = session.currentTask.tasks[session.currentTask.currentTaskIndex];

    return {
      success: true,
      message: 'Ürün toplandı / Item picked',
      nextTask,
      progress: {
        current: session.currentTask.currentTaskIndex + 1,
        total: session.currentTask.tasks.length,
      },
      instructions: `Sonraki lokasyon: ${nextTask.locationCode} / Next location: ${nextTask.locationCode}`,
      nextStep: 'scan_location',
    };
  }

  async completePicking(sessionId: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.currentTask || session.currentTask.type !== 'picking') {
      throw new BadRequestException('No active picking task');
    }

    const task = session.currentTask;

    await this.db
      .update(pickingOrders)
      .set({
        status: 'completed',
        pickedDate: new Date(),
        pickedBy: session.userId,
        metadata: {
          pickedItems: task.pickedItems,
          completedAt: new Date(),
        },
      })
      .where(eq(pickingOrders.id, task.pickingOrderId));

    for (const item of task.pickedItems) {
      await this.eventBus.emit('item.picked', {
        pickingOrderId: task.pickingOrderId,
        productId: item.productId,
        quantity: item.pickedQuantity,
        locationId: item.locationId,
        tenantId: session.tenantId,
        userId: session.userId,
      });
    }

    session.currentTask = null;
    this.activeSessions.set(sessionId, session);

    return {
      success: true,
      message: 'Toplama tamamlandı / Picking completed',
      summary: {
        pickingOrderId: task.pickingOrderId,
        totalItems: task.pickedItems.length,
        totalQuantity: task.pickedItems.reduce((sum: number, item: any) => sum + item.pickedQuantity, 0),
        completedAt: new Date(),
      },
    };
  }

  private optimizePickingRoute(tasks: any[]): any[] {
    // Simple zone-aisle-rack sorting
    return tasks.sort((a, b) => {
      if (a.zone !== b.zone) return a.zone.localeCompare(b.zone);
      if (a.aisle !== b.aisle) return a.aisle.localeCompare(b.aisle);
      return (a.rack || '').localeCompare(b.rack || '');
    });
  }

  // ============================================================================
  // PALLET OPERATIONS (Axata: Palet İşlemleri)
  // ============================================================================

  async mergePalletsMobile(sessionId: string, sourcePalletIds: string[], targetPalletId: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    const mergeId = `MERGE-HH-${Date.now()}`;
    const mergedItems = [];

    for (const sourcePalletId of sourcePalletIds) {
      const sourceInv = await this.db
        .select()
        .from(inventory)
        .where(eq(inventory.id, sourcePalletId));

      for (const item of sourceInv) {
        const targetInv = await this.db
          .select()
          .from(inventory)
          .where(
            and(
              eq(inventory.productId, item.productId),
              eq(inventory.id, targetPalletId)
            )
          )
          .limit(1);

        if (targetInv.length > 0) {
          await this.db
            .update(inventory)
            .set({
              quantityOnHand: (targetInv[0].quantityOnHand || 0) + (item.quantityOnHand || 0),
              updatedAt: new Date(),
            })
            .where(eq(inventory.id, targetInv[0].id));
        }

        mergedItems.push(item);
      }

      await this.db.delete(inventory).where(eq(inventory.id, sourcePalletId));
    }

    await this.eventBus.emit('pallets.merged.mobile', {
      mergeId,
      sourcePalletIds,
      targetPalletId,
      userId: session.userId,
      deviceId: session.deviceId,
    });

    return {
      success: true,
      message: 'Paletler birleştirildi / Pallets merged',
      mergeId,
      mergedItems: mergedItems.length,
      targetPalletId,
    };
  }

  async splitPalletMobile(sessionId: string, sourcePalletId: string, splits: Array<{
    productId: string;
    quantity: number;
  }>) {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    const splitId = `SPLIT-HH-${Date.now()}`;
    const newPallets = [];

    for (const split of splits) {
      const newPalletId = `PLT-${Date.now()}-${newPallets.length}`;

      const [newInv] = await this.db
        .insert(inventory)
        .values({
          id: newPalletId,
          warehouseId: session.warehouseId,
          productId: split.productId,
          quantityOnHand: split.quantity,
          quantityAvailable: split.quantity,
          quantityAllocated: 0,
        })
        .returning();

      newPallets.push(newInv);

      // Reduce source
      await this.db
        .update(inventory)
        .set({
          quantityOnHand: sql`${inventory.quantityOnHand} - ${split.quantity}`,
        })
        .where(
          and(
            eq(inventory.id, sourcePalletId),
            eq(inventory.productId, split.productId)
          )
        );
    }

    await this.eventBus.emit('pallet.split.mobile', {
      splitId,
      sourcePalletId,
      newPallets: newPallets.length,
      userId: session.userId,
    });

    return {
      success: true,
      message: 'Palet bölündü / Pallet split',
      splitId,
      newPallets,
    };
  }

  // ============================================================================
  // CYCLE COUNT OPERATIONS (Axata: Sayım İşlemleri)
  // ============================================================================

  async startCycleCountMobile(sessionId: string, locationCode?: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    let location;
    if (locationCode) {
      [location] = await this.db
        .select()
        .from(locations)
        .where(and(eq(locations.code, locationCode), eq(locations.warehouseId, session.warehouseId)))
        .limit(1);

      if (!location) {
        return {
          success: false,
          message: 'Lokasyon bulunamadı / Location not found',
          locationCode,
        };
      }
    }

    const countId = `COUNT-HH-${Date.now()}`;

    session.currentTask = {
      type: 'cycle_count',
      countId,
      locationId: location?.id,
      locationCode: location?.code,
      counts: [],
      mode: 'blind',
      startedAt: new Date(),
    };

    this.activeSessions.set(sessionId, session);

    return {
      success: true,
      countId,
      location,
      instructions: 'Ürün tarayın ve sayın / Scan and count products',
      mode: 'blind',
      nextStep: 'scan_product',
    };
  }

  async recordCountMobile(sessionId: string, barcode: string, quantity: number) {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.currentTask || session.currentTask.type !== 'cycle_count') {
      throw new BadRequestException('No active count task');
    }

    const [product] = await this.db
      .select()
      .from(products)
      .where(or(eq(products.barcode, barcode), eq(products.sku, barcode)))
      .limit(1);

    if (!product) {
      return {
        success: false,
        message: 'Ürün bulunamadı / Product not found',
        barcode,
      };
    }

    // Get system quantity
    const [systemInv] = await this.db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.productId, product.id),
          eq(inventory.locationId, session.currentTask.locationId)
        )
      )
      .limit(1);

    const systemQty = systemInv?.quantityOnHand || 0;
    const variance = quantity - systemQty;

    session.currentTask.counts.push({
      productId: product.id,
      sku: product.sku,
      barcode: product.barcode,
      countedQuantity: quantity,
      systemQuantity: systemQty,
      variance,
      countedAt: new Date(),
      countedBy: session.userId,
    });

    this.activeSessions.set(sessionId, session);

    return {
      success: true,
      message: 'Sayım kaydedildi / Count recorded',
      product,
      countedQuantity: quantity,
      systemQuantity: systemQty,
      variance,
      varianceWarning: variance !== 0,
      canContinue: true,
      nextStep: 'scan_product_or_complete',
    };
  }

  async completeCycleCountMobile(sessionId: string, requiresApproval: boolean = false) {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.currentTask || session.currentTask.type !== 'cycle_count') {
      throw new BadRequestException('No active count task');
    }

    const task = session.currentTask;
    const hasVariances = task.counts.some((c: any) => c.variance !== 0);

    // If has variances and requires approval, mark for approval
    if (hasVariances && requiresApproval) {
      await this.eventBus.emit('cycle.count.pending.approval', {
        countId: task.countId,
        locationId: task.locationId,
        counts: task.counts,
        userId: session.userId,
      });

      session.currentTask = null;
      this.activeSessions.set(sessionId, session);

      return {
        success: true,
        message: 'Sayım onay bekliyor / Count pending approval',
        countId: task.countId,
        totalCounts: task.counts.length,
        variances: task.counts.filter((c: any) => c.variance !== 0).length,
        status: 'pending_approval',
      };
    }

    // Auto-adjust inventory
    for (const count of task.counts) {
      if (count.variance !== 0) {
        await this.db
          .update(inventory)
          .set({
            quantityOnHand: count.countedQuantity,
            quantityAvailable: count.countedQuantity,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(inventory.productId, count.productId),
              eq(inventory.locationId, task.locationId)
            )
          );

        await this.eventBus.emit('inventory.adjusted.count', {
          productId: count.productId,
          locationId: task.locationId,
          oldQuantity: count.systemQuantity,
          newQuantity: count.countedQuantity,
          variance: count.variance,
          reason: 'cycle_count',
          countId: task.countId,
        });
      }
    }

    session.currentTask = null;
    this.activeSessions.set(sessionId, session);

    return {
      success: true,
      message: 'Sayım tamamlandı / Count completed',
      countId: task.countId,
      summary: {
        totalCounts: task.counts.length,
        variances: task.counts.filter((c: any) => c.variance !== 0).length,
        adjustmentsMade: task.counts.filter((c: any) => c.variance !== 0).length,
      },
    };
  }

  // ============================================================================
  // TRANSFER OPERATIONS (Axata: Transfer İşlemleri)
  // ============================================================================

  async startTransferMobile(sessionId: string, transferType: 'location' | 'warehouse' | 'code_to_code') {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    const transferId = `TRANS-HH-${Date.now()}`;

    session.currentTask = {
      type: 'transfer',
      transferId,
      transferType,
      fromScanned: false,
      toScanned: false,
      items: [],
      startedAt: new Date(),
    };

    this.activeSessions.set(sessionId, session);

    return {
      success: true,
      transferId,
      transferType,
      instructions: transferType === 'location' 
        ? 'Kaynak lokasyonu tarayın / Scan source location'
        : 'Palet veya ürün tarayın / Scan pallet or product',
      nextStep: 'scan_source',
    };
  }

  async scanTransferSource(sessionId: string, sourceCode: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.currentTask || session.currentTask.type !== 'transfer') {
      throw new BadRequestException('No active transfer task');
    }

    if (session.currentTask.transferType === 'location' || session.currentTask.transferType === 'code_to_code') {
      const [location] = await this.db
        .select()
        .from(locations)
        .where(eq(locations.code, sourceCode))
        .limit(1);

      if (!location) {
        return {
          success: false,
          message: 'Kaynak lokasyon bulunamadı / Source location not found',
          sourceCode,
        };
      }

      session.currentTask.fromLocationId = location.id;
      session.currentTask.fromLocationCode = location.code;
      session.currentTask.fromScanned = true;
    }

    this.activeSessions.set(sessionId, session);

    return {
      success: true,
      message: 'Kaynak tarandı / Source scanned',
      from: sourceCode,
      instructions: 'Hedef lokasyonu tarayın / Scan destination location',
      nextStep: 'scan_destination',
    };
  }

  async scanTransferDestination(sessionId: string, destinationCode: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.currentTask) {
      throw new BadRequestException('No active task');
    }

    const [location] = await this.db
      .select()
      .from(locations)
      .where(eq(locations.code, destinationCode))
      .limit(1);

    if (!location) {
      return {
        success: false,
        message: 'Hedef lokasyon bulunamadı / Destination location not found',
        destinationCode,
      };
    }

    session.currentTask.toLocationId = location.id;
    session.currentTask.toLocationCode = location.code;
    session.currentTask.toScanned = true;

    this.activeSessions.set(sessionId, session);

    return {
      success: true,
      message: 'Hedef tarandı / Destination scanned',
      from: session.currentTask.fromLocationCode,
      to: location.code,
      instructions: 'Transfer işlemini onaylayın / Confirm transfer',
      nextStep: 'confirm_transfer',
    };
  }

  async confirmTransferMobile(sessionId: string, transferAll: boolean = true) {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.currentTask || session.currentTask.type !== 'transfer') {
      throw new BadRequestException('No active transfer task');
    }

    const task = session.currentTask;

    // Move inventory
    const itemsToTransfer = await this.db
      .select()
      .from(inventory)
      .where(eq(inventory.locationId, task.fromLocationId));

    for (const item of itemsToTransfer) {
      await this.db
        .update(inventory)
        .set({
          locationId: task.toLocationId,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, item.id));
    }

    // Update locations
    await this.db
      .update(locations)
      .set({ isOccupied: false })
      .where(eq(locations.id, task.fromLocationId));

    await this.db
      .update(locations)
      .set({ isOccupied: true })
      .where(eq(locations.id, task.toLocationId));

    await this.eventBus.emit('transfer.completed.mobile', {
      transferId: task.transferId,
      fromLocation: task.fromLocationCode,
      toLocation: task.toLocationCode,
      itemsMoved: itemsToTransfer.length,
      userId: session.userId,
    });

    session.currentTask = null;
    this.activeSessions.set(sessionId, session);

    return {
      success: true,
      message: 'Transfer tamamlandı / Transfer completed',
      transferId: task.transferId,
      from: task.fromLocationCode,
      to: task.toLocationCode,
      itemsMoved: itemsToTransfer.length,
    };
  }

  // ============================================================================
  // QUALITY CONTROL MOBILE (Axata: Kalite Kontrol)
  // ============================================================================

  async startQualityInspectionMobile(sessionId: string, palletId: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    const [pallet] = await this.db
      .select({ inventory, product: products })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .where(eq(inventory.id, palletId))
      .limit(1);

    if (!pallet) {
      return {
        success: false,
        message: 'Palet bulunamadı / Pallet not found',
        palletId,
      };
    }

    const inspectionId = `QC-HH-${Date.now()}`;
    const qcQuestions = this.getQcQuestions(pallet.product?.metadata?.category);

    session.currentTask = {
      type: 'quality_inspection',
      inspectionId,
      palletId,
      pallet,
      questions: qcQuestions,
      answers: [],
      photos: [],
      startedAt: new Date(),
    };

    this.activeSessions.set(sessionId, session);

    return {
      success: true,
      inspectionId,
      pallet,
      questions: qcQuestions,
      instructions: 'Kalite kontrol sorularını yanıtlayın / Answer QC questions',
      nextStep: 'answer_questions',
    };
  }

  async answerQcQuestionMobile(sessionId: string, questionId: string, answer: any, photo?: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.currentTask || session.currentTask.type !== 'quality_inspection') {
      throw new BadRequestException('No active QC task');
    }

    session.currentTask.answers.push({
      questionId,
      answer,
      answeredAt: new Date(),
    });

    if (photo) {
      session.currentTask.photos.push(photo);
    }

    const remainingQuestions = session.currentTask.questions.filter(
      (q: any) => !session.currentTask.answers.some((a: any) => a.questionId === q.id)
    );

    this.activeSessions.set(sessionId, session);

    return {
      success: true,
      message: 'Cevap kaydedildi / Answer recorded',
      remaining: remainingQuestions.length,
      nextStep: remainingQuestions.length > 0 ? 'answer_questions' : 'complete_inspection',
    };
  }

  async completeQcInspectionMobile(sessionId: string, passed: boolean) {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.currentTask) {
      throw new BadRequestException('No active task');
    }

    const task = session.currentTask;

    await this.eventBus.emit('quality.inspection.completed.mobile', {
      inspectionId: task.inspectionId,
      palletId: task.palletId,
      passed,
      answers: task.answers,
      photos: task.photos,
      userId: session.userId,
    });

    // If failed, quarantine
    if (!passed) {
      await this.db
        .update(inventory)
        .set({
          metadata: {
            quarantined: true,
            qcFailed: true,
            inspectionId: task.inspectionId,
          },
          quantityAvailable: 0,
        })
        .where(eq(inventory.id, task.palletId));
    }

    session.currentTask = null;
    this.activeSessions.set(sessionId, session);

    return {
      success: true,
      message: passed ? 'Kalite kontrol geçti / QC passed' : 'Kalite kontrol başarısız / QC failed',
      inspectionId: task.inspectionId,
      passed,
      action: passed ? 'released' : 'quarantined',
    };
  }

  private getQcQuestions(category?: string) {
    return [
      { id: 'q1', question: 'Ambalaj hasarlı mı?', type: 'yes_no' },
      { id: 'q2', question: 'Ürün hasarlı mı?', type: 'yes_no' },
      { id: 'q3', question: 'Etiketler doğru mu?', type: 'yes_no' },
      { id: 'q4', question: 'Son kullanma tarihi kontrol edildi mi?', type: 'yes_no' },
      { id: 'q5', question: 'Miktar doğru mu?', type: 'yes_no' },
    ];
  }

  // ============================================================================
  // INVENTORY ADJUSTMENT MOBILE (Axata: Stok Düzeltme)
  // ============================================================================

  async startInventoryAdjustmentMobile(sessionId: string, locationCode: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    const [location] = await this.db
      .select()
      .from(locations)
      .where(eq(locations.code, locationCode))
      .limit(1);

    if (!location) {
      return {
        success: false,
        message: 'Lokasyon bulunamadı / Location not found',
        locationCode,
      };
    }

    const adjustmentId = `ADJ-HH-${Date.now()}`;

    session.currentTask = {
      type: 'adjustment',
      adjustmentId,
      locationId: location.id,
      locationCode: location.code,
      adjustments: [],
      startedAt: new Date(),
    };

    this.activeSessions.set(sessionId, session);

    return {
      success: true,
      adjustmentId,
      location,
      instructions: 'Ürün tarayın / Scan product',
      nextStep: 'scan_product',
    };
  }

  async recordAdjustmentMobile(sessionId: string, barcode: string, newQuantity: number, reason: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.currentTask || session.currentTask.type !== 'adjustment') {
      throw new BadRequestException('No active adjustment task');
    }

    const [product] = await this.db
      .select()
      .from(products)
      .where(or(eq(products.barcode, barcode), eq(products.sku, barcode)))
      .limit(1);

    if (!product) {
      return {
        success: false,
        message: 'Ürün bulunamadı / Product not found',
        barcode,
      };
    }

    const [currentInv] = await this.db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.productId, product.id),
          eq(inventory.locationId, session.currentTask.locationId)
        )
      )
      .limit(1);

    const oldQuantity = currentInv?.quantityOnHand || 0;
    const variance = newQuantity - oldQuantity;

    // Update inventory
    if (currentInv) {
      await this.db
        .update(inventory)
        .set({
          quantityOnHand: newQuantity,
          quantityAvailable: newQuantity,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, currentInv.id));
    } else {
      await this.db.insert(inventory).values({
        warehouseId: session.warehouseId,
        locationId: session.currentTask.locationId,
        productId: product.id,
        quantityOnHand: newQuantity,
        quantityAvailable: newQuantity,
        quantityAllocated: 0,
      });
    }

    session.currentTask.adjustments.push({
      productId: product.id,
      sku: product.sku,
      oldQuantity,
      newQuantity,
      variance,
      reason,
      adjustedAt: new Date(),
      adjustedBy: session.userId,
    });

    this.activeSessions.set(sessionId, session);

    await this.eventBus.emit('inventory.adjusted.mobile', {
      adjustmentId: session.currentTask.adjustmentId,
      productId: product.id,
      locationId: session.currentTask.locationId,
      oldQuantity,
      newQuantity,
      variance,
      reason,
      userId: session.userId,
    });

    return {
      success: true,
      message: 'Düzeltme kaydedildi / Adjustment recorded',
      product,
      oldQuantity,
      newQuantity,
      variance,
      canContinue: true,
    };
  }

  // ============================================================================
  // REPLENISHMENT MOBILE (Axata: İkmal İşlemleri)
  // ============================================================================

  async getReplenishmentTasksMobile(sessionId: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    // Find locations needing replenishment
    const pickLocations = await this.db
      .select({
        location: locations,
        inventory,
        product: products,
      })
      .from(locations)
      .leftJoin(inventory, eq(locations.id, inventory.locationId))
      .leftJoin(products, eq(inventory.productId, products.id))
      .where(
        and(
          eq(locations.warehouseId, session.warehouseId),
          eq(locations.locationType, 'pick')
        )
      );

    const needsReplenishment = pickLocations.filter((loc: any) => {
      const currentQty = loc.inventory?.quantityOnHand || 0;
      const minLevel = loc.location.metadata?.minLevel || 10;
      return currentQty < minLevel;
    });

    return {
      success: true,
      totalTasks: needsReplenishment.length,
      tasks: needsReplenishment.map((loc: any) => ({
        locationCode: loc.location.code,
        sku: loc.product?.sku,
        productName: loc.product?.name,
        currentQty: loc.inventory?.quantityOnHand || 0,
        minLevel: loc.location.metadata?.minLevel || 10,
        maxLevel: loc.location.metadata?.maxLevel || 100,
        replenishQty: (loc.location.metadata?.maxLevel || 100) - (loc.inventory?.quantityOnHand || 0),
        priority: (loc.inventory?.quantityOnHand || 0) === 0 ? 'critical' : 'normal',
      })),
    };
  }

  async startReplenishmentMobile(sessionId: string, taskIndex: number) {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    const tasks = await this.getReplenishmentTasksMobile(sessionId);
    const task = tasks.tasks[taskIndex];

    if (!task) {
      return {
        success: false,
        message: 'Görev bulunamadı / Task not found',
      };
    }

    const replenishmentId = `REPL-HH-${Date.now()}`;

    session.currentTask = {
      type: 'replenishment',
      replenishmentId,
      task,
      startedAt: new Date(),
    };

    this.activeSessions.set(sessionId, session);

    return {
      success: true,
      replenishmentId,
      task,
      instructions: `Rezerv alandan ${task.replenishQty} adet alın / Get ${task.replenishQty} from reserve`,
      nextStep: 'confirm_pickup',
    };
  }

  async confirmReplenishmentMobile(sessionId: string, quantity: number) {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.currentTask || session.currentTask.type !== 'replenishment') {
      throw new BadRequestException('No active replenishment task');
    }

    const task = session.currentTask;

    await this.eventBus.emit('replenishment.completed.mobile', {
      replenishmentId: task.replenishmentId,
      locationCode: task.task.locationCode,
      quantity,
      userId: session.userId,
    });

    session.currentTask = null;
    this.activeSessions.set(sessionId, session);

    return {
      success: true,
      message: 'İkmal tamamlandı / Replenishment completed',
      replenishmentId: task.replenishmentId,
      quantity,
    };
  }
}

