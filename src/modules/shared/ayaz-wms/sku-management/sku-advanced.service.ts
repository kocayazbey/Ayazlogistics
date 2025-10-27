import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { products } from '../../../../database/schema/shared/wms.schema';
import { stockCards } from '../../../../database/schema/shared/erp-inventory.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';

/**
 * Advanced SKU Management Service
 * Detailed SKU configuration based on Axata WMS
 */
@Injectable()
export class SkuAdvancedService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * SKU Classification Codes
   * Axata: Sınıflandırma Kodları Tanımlama
   */
  async createClassificationCode(data: {
    code: string;
    name: string;
    category: string;
    subcategory?: string;
    attributes?: Record<string, any>;
    storageRequirements?: {
      temperatureMin?: number;
      temperatureMax?: number;
      humidityMin?: number;
      humidityMax?: number;
      stackable?: boolean;
      maxStackHeight?: number;
      requiresRefrigeration?: boolean;
      requiresHazmatStorage?: boolean;
    };
    handlingRules?: {
      fragile?: boolean;
      heavyItem?: boolean;
      requiresTwoPersonLift?: boolean;
      requiresForklift?: boolean;
      specialEquipment?: string[];
    };
    pickingRules?: {
      preferredStrategy?: 'FIFO' | 'LIFO' | 'FEFO';
      batchPickingAllowed?: boolean;
      wavePickingAllowed?: boolean;
      voicePickingAllowed?: boolean;
    };
    packingRules?: {
      requiresSpecialPackaging?: boolean;
      packagingMaterials?: string[];
      maxItemsPerBox?: number;
      boxTypes?: string[];
    };
  }, tenantId: string, userId: string) {
    const classificationId = `CLASS-${Date.now()}`;

    const classification = {
      id: classificationId,
      code: data.code,
      name: data.name,
      category: data.category,
      subcategory: data.subcategory,
      attributes: data.attributes || {},
      storageRequirements: data.storageRequirements || {},
      handlingRules: data.handlingRules || {},
      pickingRules: data.pickingRules || {},
      packingRules: data.packingRules || {},
      tenantId,
      createdBy: userId,
      createdAt: new Date(),
      isActive: true,
    };

    await this.eventBus.emit('sku.classification.created', {
      classificationId,
      code: data.code,
      tenantId,
    });

    return classification;
  }

  async updateClassificationCode(classificationId: string, updates: any, tenantId: string, userId: string) {
    await this.eventBus.emit('sku.classification.updated', {
      classificationId,
      tenantId,
    });

    return {
      classificationId,
      updates,
      updatedBy: userId,
      updatedAt: new Date(),
    };
  }

  async assignClassificationToSku(productId: string, classificationCode: string, tenantId: string, userId: string) {
    const [product] = await this.db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.db
      .update(products)
      .set({
        metadata: {
          ...product.metadata,
          classificationCode,
          classifiedBy: userId,
          classifiedAt: new Date(),
        },
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));

    await this.eventBus.emit('sku.classification.assigned', {
      productId,
      classificationCode,
      tenantId,
    });

    return {
      productId,
      classificationCode,
      assignedAt: new Date(),
    };
  }

  async getClassificationReport(tenantId: string) {
    return {
      tenantId,
      totalClassifications: 0,
      classifiedProducts: 0,
      unclassifiedProducts: 0,
      classifications: [],
      generatedAt: new Date(),
    };
  }

  /**
   * SKU Group Codes
   * Axata: SKU Grup Kodları Tanımlama
   */
  async createSkuGroupCode(data: {
    groupCode: string;
    groupName: string;
    pickingStrategy?: 'FIFO' | 'LIFO' | 'FEFO';
    storageRules?: {
      allowMixedPallets: boolean;
      maxStackHeight: number;
      temperatureControl: boolean;
    };
    handlingInstructions?: string;
  }, tenantId: string) {
    const groupId = `GROUP-${Date.now()}`;

    return {
      id: groupId,
      ...data,
      tenantId,
      createdAt: new Date(),
    };
  }

  /**
   * Storage Units Definition
   * Axata: Stoklama Birimleri Tanımlama
   */
  async defineStorageUnit(data: {
    unitCode: string;
    unitName: string;
    conversionFactor: number;
    baseUnit: string;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
    weight?: number;
    stackable?: boolean;
    maxStackHeight?: number;
  }, tenantId: string) {
    const unitId = `UNIT-${Date.now()}`;

    return {
      id: unitId,
      ...data,
      tenantId,
      createdAt: new Date(),
    };
  }

  /**
   * Box Types Definition
   * Axata: Kutu Tipleri Tanımlama
   */
  async defineBoxType(data: {
    boxCode: string;
    boxName: string;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    maxWeight: number;
    material?: string;
    cost?: number;
    pieceCapacity?: number;
    suitableForProducts?: string[];
  }, tenantId: string) {
    const boxTypeId = `BOX-${Date.now()}`;

    await this.eventBus.emit('box.type.created', {
      boxTypeId,
      boxCode: data.boxCode,
      tenantId,
    });

    return {
      id: boxTypeId,
      ...data,
      tenantId,
      createdAt: new Date(),
    };
  }

  /**
   * Quality Control Questions
   * Axata: Kalite Kontrol Soruları Tanımlama
   */
  async defineQcQuestion(data: {
    questionCode: string;
    questionText: string;
    questionType: 'yes_no' | 'numeric' | 'text' | 'rating';
    applicableFor: string[];
    mandatoryFor?: string[];
    acceptanceCriteria?: any;
    failureAction?: 'reject' | 'quarantine' | 'downgrade';
  }, tenantId: string) {
    const questionId = `QC-Q-${Date.now()}`;

    return {
      id: questionId,
      ...data,
      tenantId,
      createdAt: new Date(),
    };
  }

  /**
   * Consumables/Supplies Management
   * Axata: Sarf Malzemeleri Tanımlama
   */
  async defineConsumable(data: {
    sku: string;
    name: string;
    consumableType: 'pallet' | 'shrink_wrap' | 'tape' | 'box' | 'label' | 'other';
    unitCost: number;
    reorderPoint: number;
    supplier?: string;
    leadTimeDays?: number;
  }, tenantId: string, userId: string) {
    const [consumable] = await this.db
      .insert(stockCards)
      .values({
        tenantId,
        stockCode: data.sku,
        stockName: data.name,
        unit: 'piece',
        purchasePrice: data.unitCost.toString(),
        minStockLevel: data.reorderPoint.toString(),
        isActive: true,
        metadata: {
          itemType: 'consumable',
          consumableType: data.consumableType,
          supplier: data.supplier,
          leadTimeDays: data.leadTimeDays,
        },
        createdBy: userId,
      })
      .returning();

    return consumable;
  }

  /**
   * Bulk update SKU main information
   * Axata: SKU Ana Bilgileri Toplu Değiştirme
   */
  async bulkUpdateSkuMainInfo(updates: Array<{
    productId: string;
    changes: {
      name?: string;
      category?: string;
      weight?: number;
      dimensions?: { length: number; width: number; height: number };
      isHazmat?: boolean;
      isPerishable?: boolean;
    };
  }>, tenantId: string, userId: string) {
    const results = [];

    for (const update of updates) {
      try {
        const [product] = await this.db
          .select()
          .from(products)
          .where(
            and(
              eq(products.id, update.productId),
              eq(products.tenantId, tenantId)
            )
          )
          .limit(1);

        if (!product) {
          results.push({
            productId: update.productId,
            success: false,
            error: 'Product not found',
          });
          continue;
        }

        await this.db
          .update(products)
          .set({
            ...update.changes,
            weight: update.changes.weight?.toString(),
            length: update.changes.dimensions?.length.toString(),
            width: update.changes.dimensions?.width.toString(),
            height: update.changes.dimensions?.height.toString(),
            updatedAt: new Date(),
          })
          .where(eq(products.id, update.productId));

        results.push({
          productId: update.productId,
          success: true,
        });
      } catch (error) {
        results.push({
          productId: update.productId,
          success: false,
          error: error.message,
        });
      }
    }

    await this.eventBus.emit('sku.bulk.updated', {
      count: updates.length,
      successful: results.filter(r => r.success).length,
      tenantId,
    });

    return {
      total: updates.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      details: results,
    };
  }

  /**
   * Change SKU zone code
   * Axata: SKU Bölge Kodu Değiştirme
   */
  async changeSkuZoneCode(data: {
    productId: string;
    newZoneCode: string;
    reason: string;
  }, tenantId: string, userId: string) {
    const [product] = await this.db
      .select()
      .from(products)
      .where(eq(products.id, data.productId))
      .limit(1);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.db
      .update(products)
      .set({
        metadata: {
          ...product.metadata,
          zoneCode: data.newZoneCode,
          zoneChangeHistory: [
            ...(product.metadata?.zoneChangeHistory || []),
            {
              oldZone: product.metadata?.zoneCode,
              newZone: data.newZoneCode,
              reason: data.reason,
              changedBy: userId,
              changedAt: new Date(),
            },
          ],
        },
        updatedAt: new Date(),
      })
      .where(eq(products.id, data.productId));

    await this.eventBus.emit('sku.zone.changed', {
      productId: data.productId,
      newZone: data.newZoneCode,
      tenantId,
    });

    return {
      productId: data.productId,
      previousZone: product.metadata?.zoneCode,
      newZone: data.newZoneCode,
      changedAt: new Date(),
    };
  }

  /**
   * SKU FIFO parameter change
   * Axata: SKU FIFO Parametresi Değiştirme
   */
  async changeSkuFifoParameter(data: {
    productId: string;
    fifoEnabled: boolean;
    fefoEnabled: boolean;
    strictMode: boolean;
  }, tenantId: string) {
    await this.db
      .update(products)
      .set({
        metadata: {
          fifoEnabled: data.fifoEnabled,
          fefoEnabled: data.fefoEnabled,
          strictMode: data.strictMode,
          fifoUpdatedAt: new Date(),
        },
      })
      .where(eq(products.id, data.productId));

    return {
      productId: data.productId,
      settings: data,
      updated: true,
    };
  }

  /**
   * SKU Suspension Operations
   * Axata: SKU Askı İşlemleri
   */
  async suspendSku(data: {
    productId: string;
    reason: string;
    suspensionType: 'receiving' | 'picking' | 'shipping' | 'all';
    effectiveDate: Date;
    expiryDate?: Date;
    notes?: string;
  }, tenantId: string, userId: string) {
    const [product] = await this.db
      .select()
      .from(products)
      .where(eq(products.id, data.productId))
      .limit(1);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.db
      .update(products)
      .set({
        metadata: {
          ...product.metadata,
          suspended: true,
          suspensionDetails: {
            reason: data.reason,
            type: data.suspensionType,
            effectiveDate: data.effectiveDate,
            expiryDate: data.expiryDate,
            notes: data.notes,
            suspendedBy: userId,
            suspendedAt: new Date(),
          },
        },
      })
      .where(eq(products.id, data.productId));

    await this.eventBus.emit('sku.suspended', {
      productId: data.productId,
      suspensionType: data.suspensionType,
      tenantId,
    });

    return {
      productId: data.productId,
      suspended: true,
      suspensionType: data.suspensionType,
    };
  }

  async unsuspendSku(productId: string, tenantId: string, userId: string) {
    const [product] = await this.db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.db
      .update(products)
      .set({
        metadata: {
          ...product.metadata,
          suspended: false,
          unsuspendedBy: userId,
          unsuspendedAt: new Date(),
        },
      })
      .where(eq(products.id, productId));

    await this.eventBus.emit('sku.unsuspended', {
      productId,
      tenantId,
    });

    return {
      productId,
      suspended: false,
      unsuspendedAt: new Date(),
    };
  }
}

