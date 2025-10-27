import { Injectable, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Transport Pallet Creation Service (Axata-style)
 * Taşıma Paleti Oluştur - Detailed implementation
 * Creates transport pallets for moving goods between zones/locations
 */

export interface TransportPallet {
  id: string;
  palletNumber: string;
  palletType: 'EURO' | 'STANDARD' | 'CUSTOM' | 'PLASTIC' | 'METAL';
  status: 'EMPTY' | 'LOADING' | 'LOADED' | 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED';
  sourceLocationId?: string;
  destinationLocationId?: string;
  items: TransportPalletItem[];
  totalWeight: number;
  totalVolume: number;
  totalItems: number;
  createdBy: string;
  createdAt: Date;
  loadedAt?: Date;
  deliveredAt?: Date;
  currentZone?: string;
  notes?: string;
}

export interface TransportPalletItem {
  id: string;
  skuCode: string;
  skuDescription: string;
  quantity: number;
  weight: number;
  volume: number;
  lotNumber?: string;
  serialNumbers?: string[];
  sourcePalletId?: string;
  sourceLocationId?: string;
  addedAt: Date;
}

export interface TransportPalletCreationRequest {
  palletType: 'EURO' | 'STANDARD' | 'CUSTOM' | 'PLASTIC' | 'METAL';
  sourceLocationId?: string;
  destinationLocationId?: string;
  items: Array<{
    skuCode: string;
    quantity: number;
    sourcePalletId?: string;
    lotNumber?: string;
    serialNumbers?: string[];
  }>;
  createdBy: string;
  notes?: string;
}

@Injectable()
export class TransportPalletService {
  private transportPallets: Map<string, TransportPallet> = new Map();
  private palletNumberSequence: number = 1;

  constructor(private eventEmitter: EventEmitter2) {}

  /**
   * Create transport pallet (Taşıma Paleti Oluştur)
   */
  async createTransportPallet(request: TransportPalletCreationRequest): Promise<TransportPallet> {
    // Generate pallet number
    const palletNumber = this.generatePalletNumber(request.palletType);

    // Validate items
    await this.validateItems(request.items);

    // Calculate totals
    const items: TransportPalletItem[] = [];
    let totalWeight = 0;
    let totalVolume = 0;
    let totalItems = 0;

    for (const item of request.items) {
      // Mock: Fetch SKU details
      const skuDetails = await this.getSkuDetails(item.skuCode);

      const palletItem: TransportPalletItem = {
        id: `TPITEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        skuCode: item.skuCode,
        skuDescription: skuDetails.description,
        quantity: item.quantity,
        weight: skuDetails.weight * item.quantity,
        volume: skuDetails.volume * item.quantity,
        lotNumber: item.lotNumber,
        serialNumbers: item.serialNumbers,
        sourcePalletId: item.sourcePalletId,
        sourceLocationId: request.sourceLocationId,
        addedAt: new Date(),
      };

      items.push(palletItem);
      totalWeight += palletItem.weight;
      totalVolume += palletItem.volume;
      totalItems += item.quantity;
    }

    // Check capacity limits
    await this.checkCapacityLimits(request.palletType, totalWeight, totalVolume);

    const transportPallet: TransportPallet = {
      id: `TP-${Date.now()}`,
      palletNumber,
      palletType: request.palletType,
      status: 'LOADING',
      sourceLocationId: request.sourceLocationId,
      destinationLocationId: request.destinationLocationId,
      items,
      totalWeight,
      totalVolume,
      totalItems,
      createdBy: request.createdBy,
      createdAt: new Date(),
      notes: request.notes,
    };

    this.transportPallets.set(transportPallet.id, transportPallet);

    await this.eventEmitter.emitAsync('transport.pallet.created', transportPallet);

    return transportPallet;
  }

  /**
   * Add items to transport pallet
   */
  async addItemsToTransportPallet(params: {
    palletId: string;
    items: Array<{
      skuCode: string;
      quantity: number;
      sourcePalletId?: string;
      lotNumber?: string;
      serialNumbers?: string[];
    }>;
    addedBy: string;
  }): Promise<TransportPallet> {
    const pallet = this.transportPallets.get(params.palletId);
    if (!pallet) {
      throw new BadRequestException('Transport pallet not found');
    }

    if (pallet.status !== 'LOADING' && pallet.status !== 'EMPTY') {
      throw new BadRequestException(`Cannot add items to pallet with status: ${pallet.status}`);
    }

    // Add items and recalculate totals
    for (const item of params.items) {
      const skuDetails = await this.getSkuDetails(item.skuCode);

      const palletItem: TransportPalletItem = {
        id: `TPITEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        skuCode: item.skuCode,
        skuDescription: skuDetails.description,
        quantity: item.quantity,
        weight: skuDetails.weight * item.quantity,
        volume: skuDetails.volume * item.quantity,
        lotNumber: item.lotNumber,
        serialNumbers: item.serialNumbers,
        sourcePalletId: item.sourcePalletId,
        addedAt: new Date(),
      };

      pallet.items.push(palletItem);
      pallet.totalWeight += palletItem.weight;
      pallet.totalVolume += palletItem.volume;
      pallet.totalItems += item.quantity;
    }

    // Check capacity after adding
    await this.checkCapacityLimits(pallet.palletType, pallet.totalWeight, pallet.totalVolume);

    pallet.status = 'LOADING';

    await this.eventEmitter.emitAsync('transport.pallet.items.added', {
      palletId: params.palletId,
      itemsAdded: params.items.length,
      addedBy: params.addedBy,
    });

    return pallet;
  }

  /**
   * Remove item from transport pallet
   */
  async removeItemFromTransportPallet(palletId: string, itemId: string, removedBy: string): Promise<TransportPallet> {
    const pallet = this.transportPallets.get(palletId);
    if (!pallet) {
      throw new BadRequestException('Transport pallet not found');
    }

    if (pallet.status !== 'LOADING' && pallet.status !== 'EMPTY') {
      throw new BadRequestException(`Cannot remove items from pallet with status: ${pallet.status}`);
    }

    const itemIndex = pallet.items.findIndex((item) => item.id === itemId);
    if (itemIndex === -1) {
      throw new BadRequestException('Item not found in pallet');
    }

    const removedItem = pallet.items.splice(itemIndex, 1)[0];

    pallet.totalWeight -= removedItem.weight;
    pallet.totalVolume -= removedItem.volume;
    pallet.totalItems -= removedItem.quantity;

    if (pallet.items.length === 0) {
      pallet.status = 'EMPTY';
    }

    await this.eventEmitter.emitAsync('transport.pallet.item.removed', {
      palletId,
      itemId,
      removedBy,
    });

    return pallet;
  }

  /**
   * Mark pallet as loaded
   */
  async markAsLoaded(palletId: string, loadedBy: string): Promise<TransportPallet> {
    const pallet = this.transportPallets.get(palletId);
    if (!pallet) {
      throw new BadRequestException('Transport pallet not found');
    }

    if (pallet.items.length === 0) {
      throw new BadRequestException('Cannot load empty pallet');
    }

    pallet.status = 'LOADED';
    pallet.loadedAt = new Date();

    await this.eventEmitter.emitAsync('transport.pallet.loaded', {
      palletId,
      loadedBy,
      totalItems: pallet.totalItems,
      totalWeight: pallet.totalWeight,
    });

    return pallet;
  }

  /**
   * Start pallet transit
   */
  async startTransit(palletId: string, currentZone: string): Promise<TransportPallet> {
    const pallet = this.transportPallets.get(palletId);
    if (!pallet) {
      throw new BadRequestException('Transport pallet not found');
    }

    if (pallet.status !== 'LOADED') {
      throw new BadRequestException(`Cannot transit pallet with status: ${pallet.status}`);
    }

    pallet.status = 'IN_TRANSIT';
    pallet.currentZone = currentZone;

    await this.eventEmitter.emitAsync('transport.pallet.transit.started', {
      palletId,
      currentZone,
    });

    return pallet;
  }

  /**
   * Update pallet location during transit
   */
  async updateTransitLocation(palletId: string, currentZone: string): Promise<TransportPallet> {
    const pallet = this.transportPallets.get(palletId);
    if (!pallet) {
      throw new BadRequestException('Transport pallet not found');
    }

    pallet.currentZone = currentZone;

    await this.eventEmitter.emitAsync('transport.pallet.location.updated', {
      palletId,
      currentZone,
      timestamp: new Date(),
    });

    return pallet;
  }

  /**
   * Mark pallet as delivered
   */
  async markAsDelivered(palletId: string, deliveredBy: string): Promise<TransportPallet> {
    const pallet = this.transportPallets.get(palletId);
    if (!pallet) {
      throw new BadRequestException('Transport pallet not found');
    }

    pallet.status = 'DELIVERED';
    pallet.deliveredAt = new Date();

    await this.eventEmitter.emitAsync('transport.pallet.delivered', {
      palletId,
      deliveredBy,
      deliveredAt: pallet.deliveredAt,
      totalTransitTime: pallet.loadedAt
        ? (pallet.deliveredAt.getTime() - pallet.loadedAt.getTime()) / 1000 / 60
        : 0, // minutes
    });

    return pallet;
  }

  /**
   * Return empty pallet
   */
  async returnPallet(palletId: string, returnedBy: string, reason?: string): Promise<TransportPallet> {
    const pallet = this.transportPallets.get(palletId);
    if (!pallet) {
      throw new BadRequestException('Transport pallet not found');
    }

    pallet.status = 'RETURNED';
    pallet.items = [];
    pallet.totalWeight = 0;
    pallet.totalVolume = 0;
    pallet.totalItems = 0;

    await this.eventEmitter.emitAsync('transport.pallet.returned', {
      palletId,
      returnedBy,
      reason,
    });

    return pallet;
  }

  /**
   * Get transport pallet details
   */
  getTransportPallet(palletId: string): TransportPallet {
    const pallet = this.transportPallets.get(palletId);
    if (!pallet) {
      throw new BadRequestException('Transport pallet not found');
    }
    return pallet;
  }

  /**
   * Get pallet by pallet number
   */
  getTransportPalletByNumber(palletNumber: string): TransportPallet | undefined {
    return Array.from(this.transportPallets.values()).find((p) => p.palletNumber === palletNumber);
  }

  /**
   * Get all transport pallets
   */
  getAllTransportPallets(filters?: {
    status?: string;
    palletType?: string;
    sourceLocationId?: string;
    destinationLocationId?: string;
  }): TransportPallet[] {
    let pallets = Array.from(this.transportPallets.values());

    if (filters?.status) {
      pallets = pallets.filter((p) => p.status === filters.status);
    }

    if (filters?.palletType) {
      pallets = pallets.filter((p) => p.palletType === filters.palletType);
    }

    if (filters?.sourceLocationId) {
      pallets = pallets.filter((p) => p.sourceLocationId === filters.sourceLocationId);
    }

    if (filters?.destinationLocationId) {
      pallets = pallets.filter((p) => p.destinationLocationId === filters.destinationLocationId);
    }

    return pallets;
  }

  /**
   * Get transport pallet statistics
   */
  getStatistics(): {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    averageTransitTime: number;
  } {
    const pallets = Array.from(this.transportPallets.values());

    const byStatus = pallets.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = pallets.reduce((acc, p) => {
      acc[p.palletType] = (acc[p.palletType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const deliveredPallets = pallets.filter((p) => p.deliveredAt && p.loadedAt);
    const averageTransitTime =
      deliveredPallets.length > 0
        ? deliveredPallets.reduce((sum, p) => {
            return sum + (p.deliveredAt!.getTime() - p.loadedAt!.getTime()) / 1000 / 60;
          }, 0) / deliveredPallets.length
        : 0;

    return {
      total: pallets.length,
      byStatus,
      byType,
      averageTransitTime: Math.round(averageTransitTime),
    };
  }

  /**
   * Generate pallet number
   */
  private generatePalletNumber(type: string): string {
    const prefix = {
      EURO: 'EUR',
      STANDARD: 'STD',
      CUSTOM: 'CUS',
      PLASTIC: 'PLS',
      METAL: 'MTL',
    }[type] || 'TP';

    const number = String(this.palletNumberSequence++).padStart(6, '0');
    return `${prefix}-${number}`;
  }

  /**
   * Validate items before adding to pallet
   */
  private async validateItems(items: any[]): Promise<void> {
    if (!items || items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

    for (const item of items) {
      if (item.quantity <= 0) {
        throw new BadRequestException(`Invalid quantity for SKU: ${item.skuCode}`);
      }
    }
  }

  /**
   * Get SKU details (mock)
   */
  private async getSkuDetails(skuCode: string): Promise<{
    description: string;
    weight: number;
    volume: number;
  }> {
    // Mock implementation
    return {
      description: `Product ${skuCode}`,
      weight: 1.5, // kg
      volume: 0.01, // m3
    };
  }

  /**
   * Check capacity limits
   */
  private async checkCapacityLimits(
    palletType: string,
    totalWeight: number,
    totalVolume: number,
  ): Promise<void> {
    const limits = {
      EURO: { maxWeight: 1200, maxVolume: 1.5 },
      STANDARD: { maxWeight: 1500, maxVolume: 2.0 },
      CUSTOM: { maxWeight: 2000, maxVolume: 3.0 },
      PLASTIC: { maxWeight: 800, maxVolume: 1.0 },
      METAL: { maxWeight: 2500, maxVolume: 3.5 },
    }[palletType];

    if (!limits) {
      return;
    }

    if (totalWeight > limits.maxWeight) {
      throw new BadRequestException(
        `Weight ${totalWeight}kg exceeds max capacity ${limits.maxWeight}kg for ${palletType} pallet`,
      );
    }

    if (totalVolume > limits.maxVolume) {
      throw new BadRequestException(
        `Volume ${totalVolume}m³ exceeds max capacity ${limits.maxVolume}m³ for ${palletType} pallet`,
      );
    }
  }
}

