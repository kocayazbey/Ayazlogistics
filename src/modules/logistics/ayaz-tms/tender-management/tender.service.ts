import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface TenderRequest {
  id: string;
  customerId: string;
  lanes: Array<{
    origin: string;
    destination: string;
    frequency: number;
    avgVolume: number;
  }>;
  mode: string;
  serviceType: string;
  validFrom: Date;
  validUntil: Date;
  status: 'draft' | 'published' | 'closed' | 'awarded';
}

interface TenderBid {
  id: string;
  tenderId: string;
  carrierId: string;
  carrierName: string;
  proposedRates: Array<{
    lane: string;
    rate: number;
    transitTime: number;
  }>;
  totalValue: number;
  terms: string;
  submittedAt: Date;
  validUntil: Date;
}

@Injectable()
export class TenderManagementService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createTender(data: Partial<TenderRequest>): Promise<TenderRequest> {
    const tender: TenderRequest = {
      id: `TENDER-${Date.now()}`,
      customerId: data.customerId!,
      lanes: data.lanes!,
      mode: data.mode!,
      serviceType: data.serviceType!,
      validFrom: data.validFrom!,
      validUntil: data.validUntil!,
      status: 'draft'
    };

    await this.eventBus.publish('tender.created', {
      tenderId: tender.id,
      customerId: tender.customerId
    });

    return tender;
  }

  async publishTender(tenderId: string, invitedCarriers: string[]): Promise<void> {
    await this.eventBus.publish('tender.published', {
      tenderId,
      invitedCarriers,
      publishedAt: new Date()
    });

    for (const carrierId of invitedCarriers) {
      await this.notifyCarrier(carrierId, tenderId);
    }
  }

  private async notifyCarrier(carrierId: string, tenderId: string): Promise<void> {
    console.log(`Notifying carrier ${carrierId} about tender ${tenderId}`);
  }

  async submitBid(data: Partial<TenderBid>): Promise<TenderBid> {
    const bid: TenderBid = {
      id: `BID-${Date.now()}`,
      tenderId: data.tenderId!,
      carrierId: data.carrierId!,
      carrierName: data.carrierName!,
      proposedRates: data.proposedRates!,
      totalValue: data.totalValue!,
      terms: data.terms || 'Standard carrier terms',
      submittedAt: new Date(),
      validUntil: data.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };

    await this.eventBus.publish('tender.bid.submitted', {
      bidId: bid.id,
      tenderId: bid.tenderId,
      carrierId: bid.carrierId
    });

    return bid;
  }

  async evaluateBids(tenderId: string): Promise<any> {
    const bids: TenderBid[] = [
      {
        id: 'bid-1',
        tenderId,
        carrierId: 'carrier-1',
        carrierName: 'Carrier A',
        proposedRates: [
          { lane: 'Istanbul-Ankara', rate: 2500, transitTime: 8 },
          { lane: 'Istanbul-Izmir', rate: 2200, transitTime: 7 }
        ],
        totalValue: 4700,
        terms: 'Net 30',
        submittedAt: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'bid-2',
        tenderId,
        carrierId: 'carrier-2',
        carrierName: 'Carrier B',
        proposedRates: [
          { lane: 'Istanbul-Ankara', rate: 2400, transitTime: 9 },
          { lane: 'Istanbul-Izmir', rate: 2100, transitTime: 8 }
        ],
        totalValue: 4500,
        terms: 'Net 45',
        submittedAt: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    ];

    const evaluation = bids.map(bid => ({
      ...bid,
      score: this.calculateBidScore(bid),
      recommendation: this.getBidRecommendation(bid)
    }));

    return {
      tenderId,
      totalBids: bids.length,
      bids: evaluation.sort((a, b) => b.score - a.score),
      winner: evaluation[0],
      potentialSavings: this.calculateSavings(evaluation)
    };
  }

  private calculateBidScore(bid: TenderBid): number {
    const costScore = (10000 - bid.totalValue) / 100;
    const avgTransitTime = bid.proposedRates.reduce((sum, r) => sum + r.transitTime, 0) / bid.proposedRates.length;
    const speedScore = (24 - avgTransitTime) * 5;

    return costScore + speedScore;
  }

  private getBidRecommendation(bid: TenderBid): string {
    if (bid.totalValue < 4600) return 'Best value';
    if (bid.proposedRates.every(r => r.transitTime < 8)) return 'Fastest service';
    return 'Competitive option';
  }

  private calculateSavings(bids: any[]): number {
    if (bids.length < 2) return 0;
    return bids[0].totalValue - bids[bids.length - 1].totalValue;
  }

  async awardTender(tenderId: string, bidId: string): Promise<void> {
    await this.eventBus.publish('tender.awarded', {
      tenderId,
      bidId,
      awardedAt: new Date()
    });
  }
}

