import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface ContractRate {
  id: string;
  carrierId: string;
  customerId: string;
  mode: 'sea' | 'air' | 'road' | 'rail';
  serviceType: string;
  origin: string;
  destination: string;
  rateType: 'per_kg' | 'per_cbm' | 'per_container' | 'flat';
  rate: number;
  currency: string;
  validFrom: Date;
  validUntil: Date;
  minimumCharge?: number;
  freeTime?: number;
}

interface SpotQuote {
  id: string;
  requestDate: Date;
  validUntil: Date;
  origin: string;
  destination: string;
  mode: string;
  rate: number;
  quotedBy: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

@Injectable()
export class RateManagementService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createContractRate(data: Partial<ContractRate>): Promise<ContractRate> {
    const rate: ContractRate = {
      id: crypto.randomUUID(),
      carrierId: data.carrierId!,
      customerId: data.customerId!,
      mode: data.mode!,
      serviceType: data.serviceType!,
      origin: data.origin!,
      destination: data.destination!,
      rateType: data.rateType!,
      rate: data.rate!,
      currency: data.currency || 'TRY',
      validFrom: data.validFrom!,
      validUntil: data.validUntil!,
      minimumCharge: data.minimumCharge,
      freeTime: data.freeTime
    };

    await this.eventBus.publish('rate.contract.created', {
      rateId: rate.id,
      customerId: rate.customerId,
      carrierId: rate.carrierId
    });

    return rate;
  }

  async getApplicableRate(
    customerId: string,
    mode: string,
    origin: string,
    destination: string,
    date: Date = new Date()
  ): Promise<ContractRate | null> {
    const mockRates: ContractRate[] = [
      {
        id: 'rate-1',
        carrierId: 'carrier-sea-1',
        customerId,
        mode: 'sea',
        serviceType: 'fcl',
        origin: 'Istanbul',
        destination: 'Hamburg',
        rateType: 'per_container',
        rate: 15000,
        currency: 'USD',
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2024-12-31'),
        freeTime: 7
      }
    ];

    return mockRates.find(
      r => r.customerId === customerId && 
           r.mode === mode && 
           r.validFrom <= date && 
           r.validUntil >= date
    ) || null;
  }

  async generateSpotQuote(request: {
    customerId: string;
    origin: string;
    destination: string;
    mode: string;
    serviceType: string;
    cargoDetails: {
      weight: number;
      volume: number;
      quantity: number;
    };
  }): Promise<SpotQuote> {
    const baseRate = this.calculateSpotRate(request);
    const marketAdjustment = this.getMarketAdjustment(request.mode, request.origin, request.destination);
    
    const finalRate = baseRate * (1 + marketAdjustment);

    const quote: SpotQuote = {
      id: `QUOTE-${Date.now()}`,
      requestDate: new Date(),
      validUntil: new Date(Date.now() + 48 * 60 * 60 * 1000),
      origin: request.origin,
      destination: request.destination,
      mode: request.mode,
      rate: finalRate,
      quotedBy: 'system',
      status: 'pending'
    };

    await this.eventBus.publish('quote.generated', {
      quoteId: quote.id,
      customerId: request.customerId,
      rate: quote.rate
    });

    return quote;
  }

  private calculateSpotRate(request: any): number {
    const baseRates: Record<string, number> = {
      sea: 12000,
      air: 35000,
      road: 6500,
      rail: 8000
    };

    return baseRates[request.mode] || 5000;
  }

  private getMarketAdjustment(mode: string, origin: string, destination: string): number {
    const adjustments: Record<string, number> = {
      sea: 0.05,
      air: 0.15,
      road: 0.08,
      rail: 0.03
    };

    return adjustments[mode] || 0.1;
  }

  async compareRates(
    origin: string,
    destination: string,
    mode: string,
    cargoWeight: number
  ): Promise<{
    contractRates: any[];
    spotQuotes: any[];
    recommendation: string;
  }> {
    return {
      contractRates: [
        { carrier: 'Maersk', rate: 15000, validUntil: '2024-12-31', type: 'contract' },
        { carrier: 'MSC', rate: 14500, validUntil: '2024-12-31', type: 'contract' }
      ],
      spotQuotes: [
        { carrier: 'Hapag-Lloyd', rate: 16500, validUntil: '2024-10-26', type: 'spot' },
        { carrier: 'CMA CGM', rate: 15800, validUntil: '2024-10-27', type: 'spot' }
      ],
      recommendation: 'Use contract rate from MSC for best value'
    };
  }

  async getRateHistory(
    origin: string,
    destination: string,
    mode: string,
    days: number = 90
  ): Promise<Array<{ date: Date; rate: number; source: string }>> {
    const history = [];
    const baseRate = 15000;

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const variance = (Math.random() - 0.5) * 2000;
      history.push({
        date,
        rate: baseRate + variance,
        source: i % 10 === 0 ? 'spot' : 'contract'
      });
    }

    return history.reverse();
  }

  async getRateAnalytics(mode: string): Promise<any> {
    return {
      mode,
      averageRate: 15250,
      minRate: 12500,
      maxRate: 18000,
      trend: 'stable',
      volatility: 8.5,
      marketCondition: 'normal',
      forecast: {
        next30Days: 15500,
        confidence: 85,
        trend: 'slight_increase'
      }
    };
  }
}

