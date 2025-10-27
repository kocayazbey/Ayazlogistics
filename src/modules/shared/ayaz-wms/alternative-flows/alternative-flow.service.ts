import { Injectable, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Alternative Flow Service
 * Implements Axata-style alternative path workflows:
 * - Paletten Topla vs Adresten Topla
 * - Paletli Giriş vs Toplama Gözüne Giriş
 * - Alternative Location Selection
 * - System Override Options
 */

export interface AlternativeOption {
  id: string;
  label: string;
  labelTr: string;
  description?: string;
  descriptionTr?: string;
  isRecommended?: boolean;
  requiresApproval?: boolean;
  constraints?: string[];
}

export interface FlowDecision {
  flowType: string;
  selectedOption: string;
  alternativeOptions: AlternativeOption[];
  reason?: string;
  approvedBy?: string;
}

@Injectable()
export class AlternativeFlowService {
  constructor(private eventEmitter: EventEmitter2) {}

  // ==================== PICKING ALTERNATIVES ====================

  /**
   * Get picking method alternatives
   * Paletten Topla vs Adresten Topla
   */
  async getPickingMethodAlternatives(params: {
    orderId: string;
    skuCode: string;
    requiredQuantity: number;
    preferredMethod?: 'PALLET' | 'LOCATION';
  }): Promise<AlternativeOption[]> {
    const alternatives: AlternativeOption[] = [];

    // Option 1: Pick from Pallet
    alternatives.push({
      id: 'pick-from-pallet',
      label: 'Pick from Pallet',
      labelTr: 'Paletten Topla',
      description: 'Pick full pallets or partial quantities from designated pallets',
      descriptionTr: 'Tam palet veya palet üzerinden kısmi miktar topla',
      isRecommended: params.preferredMethod === 'PALLET',
      requiresApproval: false,
      constraints: ['Requires pallet barcode scan', 'Quantity must not exceed pallet quantity'],
    });

    // Option 2: Pick from Location
    alternatives.push({
      id: 'pick-from-location',
      label: 'Pick from Location',
      labelTr: 'Adresten Topla',
      description: 'Pick items from a specific warehouse location/pick face',
      descriptionTr: 'Belirli bir depo konumu/toplama gözünden topla',
      isRecommended: params.preferredMethod === 'LOCATION',
      requiresApproval: false,
      constraints: ['Requires location barcode scan', 'Must verify SKU at location'],
    });

    // Option 3: Pick from Multiple Sources
    alternatives.push({
      id: 'pick-multi-source',
      label: 'Pick from Multiple Sources',
      labelTr: 'Çoklu Kaynaktan Topla',
      description: 'Combine picks from multiple pallets/locations',
      descriptionTr: 'Birden fazla palet/konumdan topla ve birleştir',
      isRecommended: false,
      requiresApproval: true,
      constraints: ['Requires supervisor approval', 'Must track each source separately'],
    });

    return alternatives;
  }

  /**
   * Execute picking method decision
   */
  async executePickingMethodDecision(decision: {
    orderId: string;
    skuCode: string;
    selectedMethod: string;
    userId: string;
    reason?: string;
  }): Promise<FlowDecision> {
    await this.eventEmitter.emitAsync('alternative.flow.picking.method.selected', decision);

    return {
      flowType: 'PICKING_METHOD',
      selectedOption: decision.selectedMethod,
      alternativeOptions: await this.getPickingMethodAlternatives({
        orderId: decision.orderId,
        skuCode: decision.skuCode,
        requiredQuantity: 0,
      }),
      reason: decision.reason,
    };
  }

  // ==================== RECEIVING ALTERNATIVES ====================

  /**
   * Get receiving method alternatives
   * Paletli Giriş vs Toplama Gözüne Giriş
   */
  async getReceivingMethodAlternatives(params: {
    poId: string;
    skuCode: string;
    quantity: number;
    preferredMethod?: 'PALLET' | 'PICK_FACE';
  }): Promise<AlternativeOption[]> {
    const alternatives: AlternativeOption[] = [];

    // Option 1: Receive to Pallet
    alternatives.push({
      id: 'receive-to-pallet',
      label: 'Receive to Pallet',
      labelTr: 'Paletli Giriş',
      description: 'Create pallet and putaway to storage location',
      descriptionTr: 'Palet oluştur ve depo konumuna yerleştir',
      isRecommended: params.quantity > 50 || params.preferredMethod === 'PALLET',
      requiresApproval: false,
      constraints: ['Requires pallet label printing', 'Putaway task will be created'],
    });

    // Option 2: Receive to Pick Face
    alternatives.push({
      id: 'receive-to-pick-face',
      label: 'Receive to Pick Face',
      labelTr: 'Toplama Gözüne Giriş',
      description: 'Receive directly to pick face location for immediate availability',
      descriptionTr: 'Doğrudan toplama gözüne alarak hemen kullanıma hazır hale getir',
      isRecommended: params.quantity <= 50 || params.preferredMethod === 'PICK_FACE',
      requiresApproval: false,
      constraints: ['Pick face must have capacity', 'SKU must be assigned to pick face'],
    });

    // Option 3: Split Receiving
    alternatives.push({
      id: 'split-receiving',
      label: 'Split Receiving',
      labelTr: 'Bölmeli Giriş',
      description: 'Split quantity between pallet storage and pick face',
      descriptionTr: 'Miktarı palet deposu ve toplama gözü arasında böl',
      isRecommended: false,
      requiresApproval: true,
      constraints: ['Requires supervisor approval', 'Must specify split quantities'],
    });

    // Option 4: Cross-dock
    alternatives.push({
      id: 'cross-dock',
      label: 'Cross-dock',
      labelTr: 'Cross-dock',
      description: 'Bypass storage and prepare for immediate shipment',
      descriptionTr: 'Depolamayı atla ve direkt sevkiyata hazırla',
      isRecommended: false,
      requiresApproval: true,
      constraints: ['Requires matching outbound order', 'Supervisor approval required'],
    });

    return alternatives;
  }

  /**
   * Execute receiving method decision
   */
  async executeReceivingMethodDecision(decision: {
    poId: string;
    skuCode: string;
    selectedMethod: string;
    quantity: number;
    userId: string;
    splitQuantities?: { pallet: number; pickFace: number };
    reason?: string;
  }): Promise<FlowDecision> {
    // Validate split quantities if applicable
    if (decision.selectedMethod === 'split-receiving' && decision.splitQuantities) {
      const totalSplit = decision.splitQuantities.pallet + decision.splitQuantities.pickFace;
      if (totalSplit !== decision.quantity) {
        throw new BadRequestException('Split quantities must equal total quantity');
      }
    }

    await this.eventEmitter.emitAsync('alternative.flow.receiving.method.selected', decision);

    return {
      flowType: 'RECEIVING_METHOD',
      selectedOption: decision.selectedMethod,
      alternativeOptions: await this.getReceivingMethodAlternatives({
        poId: decision.poId,
        skuCode: decision.skuCode,
        quantity: decision.quantity,
      }),
      reason: decision.reason,
    };
  }

  // ==================== PUTAWAY ALTERNATIVES ====================

  /**
   * Get putaway location alternatives (Seçmeli Yerleştirme)
   */
  async getPutawayLocationAlternatives(params: {
    palletId: string;
    skuCode: string;
    suggestedLocationId: string;
  }): Promise<{
    suggested: AlternativeOption;
    alternatives: AlternativeOption[];
  }> {
    // Suggested location (system recommendation)
    const suggested: AlternativeOption = {
      id: params.suggestedLocationId,
      label: 'Suggested Location: A-01-02-03',
      labelTr: 'Önerilen Konum: A-01-02-03',
      description: 'System-optimized location based on slotting rules',
      descriptionTr: 'Slotting kurallarına göre sistem tarafından optimize edilmiş konum',
      isRecommended: true,
      requiresApproval: false,
      constraints: ['Available capacity: 2 pallets', 'Same SKU in zone', 'FIFO compliant'],
    };

    // Alternative locations
    const alternatives: AlternativeOption[] = [
      {
        id: 'LOC-ALT-001',
        label: 'Alternative Location: A-01-02-04',
        labelTr: 'Alternatif Konum: A-01-02-04',
        description: 'Adjacent location with good accessibility',
        descriptionTr: 'Erişilebilirliği iyi komşu konum',
        isRecommended: false,
        requiresApproval: false,
        constraints: ['Available capacity: 1 pallet', 'Empty location'],
      },
      {
        id: 'LOC-ALT-002',
        label: 'Alternative Location: B-02-01-01',
        labelTr: 'Alternatif Konum: B-02-01-01',
        description: 'Different zone, slower pick access',
        descriptionTr: 'Farklı bölge, daha yavaş toplama erişimi',
        isRecommended: false,
        requiresApproval: true,
        constraints: ['Requires zone approval', 'Higher travel distance'],
      },
      {
        id: 'LOC-CUSTOM',
        label: 'Custom Location',
        labelTr: 'Özel Konum',
        description: 'Manually enter a different location',
        descriptionTr: 'Farklı bir konumu manuel olarak girin',
        isRecommended: false,
        requiresApproval: true,
        constraints: ['Requires supervisor override', 'Must provide reason'],
      },
    ];

    return { suggested, alternatives };
  }

  /**
   * Execute putaway location decision
   */
  async executePutawayLocationDecision(decision: {
    palletId: string;
    skuCode: string;
    suggestedLocationId: string;
    selectedLocationId: string;
    isAlternativeSelected: boolean;
    userId: string;
    reason?: string;
    approvedBy?: string;
  }): Promise<FlowDecision> {
    // If user rejected system suggestion, log and emit event
    if (decision.isAlternativeSelected) {
      await this.eventEmitter.emitAsync('alternative.flow.putaway.suggestion.rejected', {
        palletId: decision.palletId,
        suggestedLocationId: decision.suggestedLocationId,
        selectedLocationId: decision.selectedLocationId,
        reason: decision.reason,
        userId: decision.userId,
      });
    }

    const locationOptions = await this.getPutawayLocationAlternatives({
      palletId: decision.palletId,
      skuCode: decision.skuCode,
      suggestedLocationId: decision.suggestedLocationId,
    });

    return {
      flowType: 'PUTAWAY_LOCATION',
      selectedOption: decision.selectedLocationId,
      alternativeOptions: [locationOptions.suggested, ...locationOptions.alternatives],
      reason: decision.reason,
      approvedBy: decision.approvedBy,
    };
  }

  // ==================== TRANSFER ALTERNATIVES ====================

  /**
   * Get transfer method alternatives
   */
  async getTransferMethodAlternatives(params: {
    sourcePalletId?: string;
    sourceLocationId?: string;
    destinationLocationId?: string;
  }): Promise<AlternativeOption[]> {
    const alternatives: AlternativeOption[] = [];

    alternatives.push({
      id: 'full-pallet-transfer',
      label: 'Full Pallet Transfer',
      labelTr: 'Tam Palet Transfer',
      description: 'Transfer entire pallet to new location',
      descriptionTr: 'Tüm paleti yeni konuma transfer et',
      isRecommended: true,
      requiresApproval: false,
    });

    alternatives.push({
      id: 'partial-pallet-transfer',
      label: 'Partial Pallet Transfer',
      labelTr: 'Kısmi Palet Transfer',
      description: 'Transfer only part of pallet quantity',
      descriptionTr: 'Palet miktarının sadece bir kısmını transfer et',
      isRecommended: false,
      requiresApproval: false,
      constraints: ['Must specify quantity', 'Remaining quantity stays on pallet'],
    });

    alternatives.push({
      id: 'pallet-merge-transfer',
      label: 'Merge with Existing Pallet',
      labelTr: 'Mevcut Palet ile Birleştir',
      description: 'Merge with another pallet at destination',
      descriptionTr: 'Hedef konumdaki başka bir palet ile birleştir',
      isRecommended: false,
      requiresApproval: true,
      constraints: ['Must be same SKU', 'Supervisor approval required'],
    });

    return alternatives;
  }

  // ==================== RETURN ALTERNATIVES ====================

  /**
   * Get return disposition alternatives
   */
  async getReturnDispositionAlternatives(params: {
    returnId: string;
    condition: string;
  }): Promise<AlternativeOption[]> {
    const alternatives: AlternativeOption[] = [];

    if (params.condition === 'GOOD') {
      alternatives.push({
        id: 'return-to-stock',
        label: 'Return to Stock',
        labelTr: 'Stoka İade',
        description: 'Return item to available inventory',
        descriptionTr: 'Ürünü mevcut envantere iade et',
        isRecommended: true,
        requiresApproval: false,
      });

      alternatives.push({
        id: 'return-to-vendor',
        label: 'Return to Vendor',
        labelTr: 'Tedarikçiye İade',
        description: 'Ship back to supplier',
        descriptionTr: 'Tedarikçiye geri gönder',
        isRecommended: false,
        requiresApproval: true,
      });
    } else if (params.condition === 'DAMAGED') {
      alternatives.push({
        id: 'quarantine',
        label: 'Quarantine',
        labelTr: 'Karantinaya Al',
        description: 'Hold for inspection',
        descriptionTr: 'İnceleme için tut',
        isRecommended: true,
        requiresApproval: false,
      });

      alternatives.push({
        id: 'scrap',
        label: 'Scrap',
        labelTr: 'Hurdaya Çıkar',
        description: 'Dispose of damaged goods',
        descriptionTr: 'Hasarlı malı imha et',
        isRecommended: false,
        requiresApproval: true,
      });

      alternatives.push({
        id: 'rework',
        label: 'Rework',
        labelTr: 'Yeniden İşle',
        description: 'Repair and return to stock',
        descriptionTr: 'Onar ve stoka iade et',
        isRecommended: false,
        requiresApproval: true,
      });
    }

    return alternatives;
  }

  // ==================== GENERAL FLOW CONTROL ====================

  /**
   * Check if alternative requires approval
   */
  async requiresApproval(flowType: string, alternativeId: string): Promise<boolean> {
    // Check business rules for approval requirements
    const approvalRules = {
      'RECEIVING_METHOD': ['split-receiving', 'cross-dock'],
      'PUTAWAY_LOCATION': ['LOC-ALT-002', 'LOC-CUSTOM'],
      'PICKING_METHOD': ['pick-multi-source'],
      'TRANSFER_METHOD': ['pallet-merge-transfer'],
      'RETURN_DISPOSITION': ['return-to-vendor', 'scrap', 'rework'],
    };

    return approvalRules[flowType]?.includes(alternativeId) || false;
  }

  /**
   * Request supervisor approval for alternative flow
   */
  async requestApproval(params: {
    flowType: string;
    alternativeId: string;
    userId: string;
    reason: string;
    urgency?: 'LOW' | 'MEDIUM' | 'HIGH';
  }): Promise<{
    approvalRequestId: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    requestedAt: Date;
  }> {
    const approvalRequestId = `APR-${Date.now()}`;

    await this.eventEmitter.emitAsync('alternative.flow.approval.requested', {
      approvalRequestId,
      ...params,
    });

    // In real implementation, this would create a record and notify supervisors
    return {
      approvalRequestId,
      status: 'PENDING',
      requestedAt: new Date(),
    };
  }

  /**
   * Log alternative flow decision
   */
  private async logDecision(decision: FlowDecision & { userId: string }): Promise<void> {
    await this.eventEmitter.emitAsync('alternative.flow.decision.logged', {
      ...decision,
      timestamp: new Date(),
    });
  }
}

