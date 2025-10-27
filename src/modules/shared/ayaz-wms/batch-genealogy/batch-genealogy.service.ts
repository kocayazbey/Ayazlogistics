import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface BatchNode {
  batchNumber: string;
  productId: string;
  quantity: number;
  createdAt: Date;
  parentBatches?: string[];
  childBatches?: string[];
}

interface TraceabilityRecord {
  id: string;
  batchNumber: string;
  eventType: 'created' | 'received' | 'split' | 'merged' | 'processed' | 'shipped' | 'consumed';
  eventDate: Date;
  location: string;
  quantity: number;
  relatedBatches?: string[];
  metadata?: any;
}

@Injectable()
export class BatchGenealogyService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async traceBatchForward(
    batchNumber: string,
    tenantId: string,
  ): Promise<{
    rootBatch: BatchNode;
    descendants: BatchNode[];
    traceabilityChain: TraceabilityRecord[];
  }> {
    // Mock: Would recursively query batch relationships
    return {
      rootBatch: {
        batchNumber,
        productId: 'PROD-001',
        quantity: 1000,
        createdAt: new Date(),
        childBatches: [],
      },
      descendants: [],
      traceabilityChain: [],
    };
  }

  async traceBatchBackward(
    batchNumber: string,
    tenantId: string,
  ): Promise<{
    currentBatch: BatchNode;
    ancestors: BatchNode[];
    traceabilityChain: TraceabilityRecord[];
  }> {
    // Mock: Would recursively query parent batches
    return {
      currentBatch: {
        batchNumber,
        productId: 'PROD-001',
        quantity: 500,
        createdAt: new Date(),
        parentBatches: [],
      },
      ancestors: [],
      traceabilityChain: [],
    };
  }

  async recordBatchEvent(
    event: Omit<TraceabilityRecord, 'id'>,
    tenantId: string,
  ): Promise<void> {
    const eventId = `TRC-${Date.now()}`;

    await this.eventBus.emit('batch.event.recorded', {
      eventId,
      batchNumber: event.batchNumber,
      eventType: event.eventType,
      quantity: event.quantity,
      tenantId,
    });
  }

  async splitBatch(
    parentBatchNumber: string,
    splitQuantities: number[],
    tenantId: string,
    userId: string,
  ): Promise<string[]> {
    const childBatchNumbers: string[] = [];

    for (let i = 0; i < splitQuantities.length; i++) {
      const childBatch = `${parentBatchNumber}-S${i + 1}`;
      childBatchNumbers.push(childBatch);

      await this.recordBatchEvent(
        {
          batchNumber: childBatch,
          eventType: 'split',
          eventDate: new Date(),
          location: 'Warehouse',
          quantity: splitQuantities[i],
          relatedBatches: [parentBatchNumber],
        },
        tenantId,
      );
    }

    return childBatchNumbers;
  }

  async mergeBatches(
    batchNumbers: string[],
    mergedQuantity: number,
    tenantId: string,
    userId: string,
  ): Promise<string> {
    const mergedBatch = `MERGED-${Date.now()}`;

    await this.recordBatchEvent(
      {
        batchNumber: mergedBatch,
        eventType: 'merged',
        eventDate: new Date(),
        location: 'Warehouse',
        quantity: mergedQuantity,
        relatedBatches: batchNumbers,
      },
      tenantId,
    );

    return mergedBatch;
  }

  async generateGenealogyReport(
    batchNumber: string,
    tenantId: string,
  ): Promise<any> {
    const forward = await this.traceBatchForward(batchNumber, tenantId);
    const backward = await this.traceBatchBackward(batchNumber, tenantId);

    return {
      batchNumber,
      ancestors: backward.ancestors,
      descendants: forward.descendants,
      fullTraceability: [...backward.traceabilityChain, ...forward.traceabilityChain],
    };
  }
}

