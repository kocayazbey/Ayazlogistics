import { Injectable, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * ITS (Intelligent Tracking System) Integration Service
 * Full integration with external ITS for serialization and track & trace
 * Features: Serial number sync, ITS quality control, real-time tracking
 */

export interface ITSSerialNumber {
  serialNumber: string;
  gtin: string;
  batchNumber: string;
  expiryDate: Date;
  productionDate: Date;
  itsCode: string; // ITS unique code
  status: 'ACTIVE' | 'DEACTIVATED' | 'CONSUMED' | 'EXPORTED';
  createdAt: Date;
  lastSyncedAt?: Date;
}

export interface ITSAggregation {
  aggregationId: string;
  parentCode: string; // Carton or pallet ITS code
  childCodes: string[]; // Item ITS codes
  aggregationType: 'CARTON' | 'PALLET' | 'CONTAINER';
  aggregatedAt: Date;
  isActive: boolean;
}

export interface ITSTrackingEvent {
  eventType: 'PRODUCTION' | 'RECEIVING' | 'STORAGE' | 'PICKING' | 'SHIPPING' | 'DEACTIVATION';
  itsCode: string;
  locationCode: string;
  timestamp: Date;
  userId: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class ITSIntegrationService {
  private itsApiUrl: string = 'https://its.example.com/api/v1';
  private serialNumbers: Map<string, ITSSerialNumber> = new Map();
  private aggregations: Map<string, ITSAggregation> = new Map();
  private trackingEvents: ITSTrackingEvent[] = [];

  constructor(
    private eventEmitter: EventEmitter2,
    private httpService: HttpService,
  ) {}

  /**
   * Generate ITS serial numbers from ITS system
   */
  async generateITSSerialNumbers(params: {
    gtin: string;
    batchNumber: string;
    quantity: number;
    productionDate: Date;
    expiryDate: Date;
  }): Promise<ITSSerialNumber[]> {
    try {
      // Call ITS API to generate serial numbers
      const response = await firstValueFrom(
        this.httpService.post(`${this.itsApiUrl}/serialization/generate`, {
          gtin: params.gtin,
          batch: params.batchNumber,
          quantity: params.quantity,
          productionDate: params.productionDate.toISOString(),
          expiryDate: params.expiryDate.toISOString(),
        }),
      );

      const serialNumbers: ITSSerialNumber[] = response.data.serialNumbers.map((sn: any) => ({
        serialNumber: sn.serialNumber,
        gtin: params.gtin,
        batchNumber: params.batchNumber,
        expiryDate: params.expiryDate,
        productionDate: params.productionDate,
        itsCode: sn.itsCode,
        status: 'ACTIVE',
        createdAt: new Date(),
      }));

      // Store locally
      serialNumbers.forEach((sn) => this.serialNumbers.set(sn.itsCode, sn));

      await this.eventEmitter.emitAsync('its.serial.generated', {
        gtin: params.gtin,
        quantity: serialNumbers.length,
      });

      return serialNumbers;
    } catch (error) {
      // Fallback to local generation if API fails
      return this.generateLocalSerialNumbers(params);
    }
  }

  /**
   * Local serial number generation (fallback)
   */
  private generateLocalSerialNumbers(params: {
    gtin: string;
    batchNumber: string;
    quantity: number;
    productionDate: Date;
    expiryDate: Date;
  }): ITSSerialNumber[] {
    const serialNumbers: ITSSerialNumber[] = [];

    for (let i = 0; i < params.quantity; i++) {
      const serialNumber = `${params.gtin}${params.batchNumber}${String(i + 1).padStart(6, '0')}`;
      const itsCode = `ITS-${Date.now()}-${i}`;

      const sn: ITSSerialNumber = {
        serialNumber,
        gtin: params.gtin,
        batchNumber: params.batchNumber,
        expiryDate: params.expiryDate,
        productionDate: params.productionDate,
        itsCode,
        status: 'ACTIVE',
        createdAt: new Date(),
      };

      this.serialNumbers.set(itsCode, sn);
      serialNumbers.push(sn);
    }

    return serialNumbers;
  }

  /**
   * Verify ITS code with ITS system
   */
  async verifyITSCode(itsCode: string): Promise<{
    isValid: boolean;
    serialNumber?: ITSSerialNumber;
    message?: string;
  }> {
    // Check local cache first
    const localSerial = this.serialNumbers.get(itsCode);
    if (localSerial) {
      return {
        isValid: localSerial.status === 'ACTIVE',
        serialNumber: localSerial,
        message: localSerial.status === 'ACTIVE' ? 'Valid ITS code' : `ITS code is ${localSerial.status}`,
      };
    }

    try {
      // Verify with ITS API
      const response = await firstValueFrom(
        this.httpService.get(`${this.itsApiUrl}/verification/${itsCode}`),
      );

      if (response.data.valid) {
        const sn: ITSSerialNumber = {
          serialNumber: response.data.serialNumber,
          gtin: response.data.gtin,
          batchNumber: response.data.batch,
          expiryDate: new Date(response.data.expiryDate),
          productionDate: new Date(response.data.productionDate),
          itsCode,
          status: response.data.status,
          createdAt: new Date(response.data.createdAt),
          lastSyncedAt: new Date(),
        };

        this.serialNumbers.set(itsCode, sn);

        return {
          isValid: true,
          serialNumber: sn,
          message: 'Valid ITS code',
        };
      }

      return {
        isValid: false,
        message: 'Invalid ITS code',
      };
    } catch (error) {
      return {
        isValid: false,
        message: 'Failed to verify ITS code',
      };
    }
  }

  /**
   * Create aggregation (carton/pallet)
   */
  async createAggregation(params: {
    parentCode: string; // Carton or pallet ITS code
    childCodes: string[]; // Item ITS codes
    aggregationType: 'CARTON' | 'PALLET' | 'CONTAINER';
  }): Promise<ITSAggregation> {
    // Verify all child codes exist and are active
    for (const childCode of params.childCodes) {
      const verification = await this.verifyITSCode(childCode);
      if (!verification.isValid) {
        throw new BadRequestException(`Invalid child ITS code: ${childCode}`);
      }
    }

    const aggregation: ITSAggregation = {
      aggregationId: `AGG-${Date.now()}`,
      parentCode: params.parentCode,
      childCodes: params.childCodes,
      aggregationType: params.aggregationType,
      aggregatedAt: new Date(),
      isActive: true,
    };

    this.aggregations.set(aggregation.aggregationId, aggregation);

    try {
      // Sync with ITS API
      await firstValueFrom(
        this.httpService.post(`${this.itsApiUrl}/aggregation`, {
          parentCode: params.parentCode,
          childCodes: params.childCodes,
          type: params.aggregationType,
        }),
      );
    } catch (error) {
      // Log error but continue
      console.error('Failed to sync aggregation with ITS:', error);
    }

    await this.eventEmitter.emitAsync('its.aggregation.created', aggregation);

    return aggregation;
  }

  /**
   * Deaggregate (break down carton/pallet)
   */
  async deaggregate(parentCode: string): Promise<void> {
    const aggregation = Array.from(this.aggregations.values()).find(
      (agg) => agg.parentCode === parentCode && agg.isActive,
    );

    if (!aggregation) {
      throw new BadRequestException('Aggregation not found');
    }

    aggregation.isActive = false;

    try {
      // Sync with ITS API
      await firstValueFrom(
        this.httpService.post(`${this.itsApiUrl}/deaggregation`, {
          parentCode,
        }),
      );
    } catch (error) {
      console.error('Failed to sync deaggregation with ITS:', error);
    }

    await this.eventEmitter.emitAsync('its.deaggregation.completed', {
      parentCode,
      childCodes: aggregation.childCodes,
    });
  }

  /**
   * Deactivate ITS code (consumption/export)
   */
  async deactivateITSCode(itsCode: string, reason: string): Promise<void> {
    const serial = this.serialNumbers.get(itsCode);
    if (!serial) {
      throw new BadRequestException('ITS code not found');
    }

    serial.status = reason === 'EXPORT' ? 'EXPORTED' : 'DEACTIVATED';

    try {
      // Sync with ITS API
      await firstValueFrom(
        this.httpService.post(`${this.itsApiUrl}/deactivation`, {
          itsCode,
          reason,
        }),
      );
    } catch (error) {
      console.error('Failed to sync deactivation with ITS:', error);
    }

    await this.eventEmitter.emitAsync('its.code.deactivated', {
      itsCode,
      reason,
    });
  }

  /**
   * Track ITS event
   */
  async trackEvent(event: Omit<ITSTrackingEvent, 'timestamp'>): Promise<void> {
    const trackingEvent: ITSTrackingEvent = {
      ...event,
      timestamp: new Date(),
    };

    this.trackingEvents.push(trackingEvent);

    try {
      // Sync with ITS API
      await firstValueFrom(
        this.httpService.post(`${this.itsApiUrl}/tracking`, trackingEvent),
      );
    } catch (error) {
      console.error('Failed to sync tracking event with ITS:', error);
    }

    await this.eventEmitter.emitAsync('its.event.tracked', trackingEvent);
  }

  /**
   * ITS Quality Control
   */
  async performITSQualityControl(params: {
    itsCode: string;
    qcResult: 'PASS' | 'FAIL';
    qcNotes?: string;
    inspectedBy: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    const verification = await this.verifyITSCode(params.itsCode);
    if (!verification.isValid) {
      return {
        success: false,
        message: 'Invalid ITS code',
      };
    }

    // Track QC event
    await this.trackEvent({
      eventType: 'RECEIVING',
      itsCode: params.itsCode,
      locationCode: 'QC-AREA',
      userId: params.inspectedBy,
      metadata: {
        qcResult: params.qcResult,
        qcNotes: params.qcNotes,
      },
    });

    // If QC failed, deactivate the ITS code
    if (params.qcResult === 'FAIL') {
      await this.deactivateITSCode(params.itsCode, 'QC_FAILURE');
      return {
        success: true,
        message: 'ITS code deactivated due to QC failure',
      };
    }

    return {
      success: true,
      message: 'QC passed',
    };
  }

  /**
   * Sync all serial numbers with ITS system
   */
  async syncWithITSSystem(): Promise<{
    synced: number;
    failed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let synced = 0;
    let failed = 0;

    for (const [itsCode, serial] of this.serialNumbers.entries()) {
      try {
        await firstValueFrom(
          this.httpService.post(`${this.itsApiUrl}/sync`, {
            itsCode,
            ...serial,
          }),
        );
        serial.lastSyncedAt = new Date();
        synced++;
      } catch (error) {
        errors.push(`Failed to sync ${itsCode}: ${error.message}`);
        failed++;
      }
    }

    await this.eventEmitter.emitAsync('its.sync.completed', {
      synced,
      failed,
      totalErrors: errors.length,
    });

    return { synced, failed, errors };
  }

  /**
   * Get ITS tracking history for a code
   */
  getTrackingHistory(itsCode: string): ITSTrackingEvent[] {
    return this.trackingEvents.filter((event) => event.itsCode === itsCode).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get aggregation details
   */
  getAggregation(parentCode: string): ITSAggregation | undefined {
    return Array.from(this.aggregations.values()).find(
      (agg) => agg.parentCode === parentCode && agg.isActive,
    );
  }

  /**
   * Validate ITS code format
   */
  validateITSCodeFormat(itsCode: string): {
    isValid: boolean;
    message?: string;
  } {
    // ITS code format: ITS-TIMESTAMP-INDEX or GTIN+BATCH+SERIAL
    const itsPattern = /^ITS-\d{13}-\d+$/;
    const gtinPattern = /^\d{14}[A-Z0-9]{6,}\d{6}$/;

    if (itsPattern.test(itsCode) || gtinPattern.test(itsCode)) {
      return { isValid: true };
    }

    return {
      isValid: false,
      message: 'Invalid ITS code format',
    };
  }

  /**
   * Bulk verify ITS codes
   */
  async bulkVerifyITSCodes(itsCodes: string[]): Promise<{
    valid: string[];
    invalid: string[];
    total: number;
  }> {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const itsCode of itsCodes) {
      const verification = await this.verifyITSCode(itsCode);
      if (verification.isValid) {
        valid.push(itsCode);
      } else {
        invalid.push(itsCode);
      }
    }

    return {
      valid,
      invalid,
      total: itsCodes.length,
    };
  }

  /**
   * Get ITS statistics
   */
  getStatistics(): {
    totalSerialNumbers: number;
    activeSerialNumbers: number;
    deactivatedSerialNumbers: number;
    totalAggregations: number;
    activeAggregations: number;
    totalTrackingEvents: number;
  } {
    const allSerials = Array.from(this.serialNumbers.values());
    const allAggregations = Array.from(this.aggregations.values());

    return {
      totalSerialNumbers: allSerials.length,
      activeSerialNumbers: allSerials.filter((s) => s.status === 'ACTIVE').length,
      deactivatedSerialNumbers: allSerials.filter((s) => s.status === 'DEACTIVATED').length,
      totalAggregations: allAggregations.length,
      activeAggregations: allAggregations.filter((a) => a.isActive).length,
      totalTrackingEvents: this.trackingEvents.length,
    };
  }
}

